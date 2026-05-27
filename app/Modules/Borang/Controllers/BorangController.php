<?php

namespace App\Modules\Borang\Controllers;

use App\Modules\Audit\Models\AuditSchedule;
use App\Http\Controllers\Controller;
use App\Modules\Borang\Models\BorangItem;
use App\Modules\Core\Models\ActivityLog;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BorangController extends Controller
{
    private function canAccessBorangProdi(?object $user, Unit $prodi): bool
    {
        $canManageBorang = $user?->can('standard.update');
        $canAuditBorang = $user?->can('audit.score.update');
        $canViewBorang = $user?->can('audit.view');

        if (! $canManageBorang && ! $canAuditBorang && ! $canViewBorang) {
            return false;
        }

        if ($canManageBorang) {
            return true;
        }

        $isAssigned = AuditSchedule::query()
            ->where('prodi_id', $prodi->id)
            ->where(function ($query) use ($user) {
                $query->where('auditor_id', $user->id)
                    ->orWhere('lead_auditor_id', $user->id)
                    ->orWhere('auditee_id', $user->id);
            })
            ->exists();

        return $isAssigned;
    }

    private function activeProdis()
    {
        return Unit::query()
            ->where('level', 'department')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id']);
    }

    private function syncSharedBorangTemplate(?int $createdBy = null): void
    {
        $allProdis = $this->activeProdis();

        if ($allProdis->isEmpty()) {
            return;
        }

        $templateItems = BorangItem::query()
            ->select('id', 'metric_id', 'pj', 'target_sasaran', 'created_by')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->unique('metric_id')
            ->values();

        if ($templateItems->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($allProdis, $templateItems, $createdBy): void {
            foreach ($templateItems as $templateItem) {
                $existingItems = BorangItem::query()
                    ->where('metric_id', $templateItem->metric_id)
                    ->get()
                    ->keyBy(fn (BorangItem $item) => (string) $item->prodi_id);

                foreach ($allProdis as $department) {
                    $existingItem = $existingItems->get((string) $department->id);

                    if ($existingItem) {
                        $existingItem->update([
                            'pj' => $templateItem->pj,
                            'target_sasaran' => $templateItem->target_sasaran,
                        ]);

                        continue;
                    }

                    BorangItem::create([
                        'prodi_id' => $department->id,
                        'metric_id' => $templateItem->metric_id,
                        'pj' => $templateItem->pj,
                        'target_sasaran' => $templateItem->target_sasaran,
                        'created_by' => $createdBy ?? $templateItem->created_by,
                    ]);
                }
            }
        });
    }

    private function denyUnless(Request $request, string $permission, string $message): ?JsonResponse
    {
        if (! $request->user()?->can($permission)) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    public function index(Request $request, Unit $prodi): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessBorangProdi($user, $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda hanya dapat melihat borang untuk prodi yang ditugaskan kepada Anda.',
            ], 403);
        }

        abort_if($prodi->level !== 'department', 404);

        $this->syncSharedBorangTemplate($user?->id);

        $items = BorangItem::with([
            'metric.standard',
            'metric.parent',
            'evidences:id,metric_id,borang_item_id,review_status,reviewed_at,created_at',
            'metric.ptks:id,metric_id,status',
        ])
            ->where('prodi_id', $prodi->id)
            ->orderBy('id')
            ->get()
            ->map(fn (BorangItem $item) => $this->transformItem($item))
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function show(Request $request, BorangItem $borangItem): JsonResponse
    {
        $user = $request->user();

        $borangItem->loadMissing([
            'prodi.parent',
            'metric.standard',
            'metric.parent',
            'evidences:id,metric_id,borang_item_id,uploaded_by,source_type,notes,link_url,original_name,stored_name,mime_type,size_bytes,review_status,review_comment,created_at',
            'metric.ptks:id,metric_id,status',
        ]);

        $prodi = $borangItem->prodi;
        abort_if(! $prodi || $prodi->level !== 'department', 404);

        if (! $this->canAccessBorangProdi($user, $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda hanya dapat melihat detail borang untuk prodi yang ditugaskan kepada Anda.',
            ], 403);
        }

        $latestSubmission = null;
        if ($borangItem->metric_id && $user?->id) {
            $latestEvidence = TrxEvidence::query()
                ->where('borang_item_id', $borangItem->id)
                ->latest()
                ->first();

            if ($latestEvidence) {
                $latestSubmission = [
                    'id' => $latestEvidence->id,
                    'source_type' => $latestEvidence->source_type,
                    'notes' => $latestEvidence->notes,
                    'link_url' => $latestEvidence->link_url,
                    'original_name' => $latestEvidence->original_name,
                    'stored_name' => $latestEvidence->stored_name,
                    'mime_type' => $latestEvidence->mime_type,
                    'size_bytes' => $latestEvidence->size_bytes,
                    'review_status' => $latestEvidence->review_status,
                    'review_comment' => $latestEvidence->review_comment,
                    'download_url' => $latestEvidence->source_type === 'file' ? "/api/v1/evidences/{$latestEvidence->id}/download" : null,
                    'created_at' => $latestEvidence->created_at?->toISOString(),
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                ...$this->transformItem($borangItem),
                'prodi' => [
                    'id' => $prodi->id,
                    'name' => $prodi->name,
                    'code' => $prodi->code,
                ],
                'faculty' => $prodi->parent ? [
                    'id' => $prodi->parent->id,
                    'name' => $prodi->parent->name,
                    'code' => $prodi->parent->code,
                ] : null,
                'latest_submission' => $latestSubmission,
            ],
        ]);
    }

    public function storeEvidence(Request $request, BorangItem $borangItem): JsonResponse
    {
        $user = $request->user();

        if (! $user?->can('evidence.upload')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengunggah bukti borang.',
            ], 403);
        }

        $borangItem->loadMissing([
            'prodi',
            'metric.standard',
        ]);

        $prodi = $borangItem->prodi;
        abort_if(! $prodi || $prodi->level !== 'department', 404);

        if (! $this->canAccessBorangProdi($user, $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda hanya dapat mengunggah bukti untuk borang prodi yang ditugaskan kepada Anda.',
            ], 403);
        }

        $metric = $borangItem->metric;
        if (! $metric || $metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti borang hanya dapat diunggah ke node Indicator.',
            ], 422);
        }

        $validated = $request->validate([
            'source_type' => 'required|in:file,link',
            'notes' => 'nullable|string',
            'link_url' => 'nullable|url|max:2048',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
        ]);

        $hasNotes = filled($validated['notes'] ?? null);
        $hasLink = filled($validated['link_url'] ?? null);
        $hasFile = $request->hasFile('file');

        if (! $hasNotes && ! $hasLink && ! $hasFile) {
            return response()->json([
                'status' => 'error',
                'message' => 'Isi komentar/catatan atau unggah file/tautan bukti terlebih dahulu.',
            ], 422);
        }

        $payload = [
            'metric_id' => $metric->id,
            'borang_item_id' => $borangItem->id,
            'uploaded_by' => $user->id,
            'source_type' => $validated['source_type'],
            'title' => null,
            'notes' => $validated['notes'] ?? null,
            'link_url' => null,
            'file_path' => null,
            'original_name' => null,
            'stored_name' => null,
            'mime_type' => null,
            'size_bytes' => null,
            'review_status' => 'PENDING',
            'review_comment' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];

        if ($validated['source_type'] === 'link' && $hasLink) {
            $payload['link_url'] = $validated['link_url'];
        }

        if ($validated['source_type'] === 'file' && $hasFile) {
            $file = $request->file('file');
            $baseName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'bukti-borang';
            $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $file->getClientOriginalExtension());
            $directory = sprintf('evidences/borang-item-%s', $borangItem->id);
            $path = $file->storeAs($directory, $storedName, 'local');

            $payload['file_path'] = $path;
            $payload['original_name'] = $file->getClientOriginalName();
            $payload['stored_name'] = $storedName;
            $payload['mime_type'] = $file->getMimeType();
            $payload['size_bytes'] = $file->getSize();
            $payload['title'] = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        }

        $evidence = TrxEvidence::create($payload)->load('uploader:id,name,email');

        ActivityLog::record(
            'pelaksanaan.evidence_uploaded',
            TrxEvidence::class,
            $evidence->id,
            null,
            [
                'borang_item_id' => $borangItem->id,
                'metric_id' => $metric->id,
                'source_type' => $evidence->source_type,
                'title' => $evidence->title,
                'review_status' => $evidence->review_status,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti borang berhasil disimpan.',
            'data' => [
                'id' => $evidence->id,
                'metric_id' => $evidence->metric_id,
                'source_type' => $evidence->source_type,
                'notes' => $evidence->notes,
                'link_url' => $evidence->link_url,
                'original_name' => $evidence->original_name,
                'stored_name' => $evidence->stored_name,
                'mime_type' => $evidence->mime_type,
                'size_bytes' => $evidence->size_bytes,
                'review_status' => $evidence->review_status,
                'uploader' => $evidence->uploader ? [
                    'id' => $evidence->uploader->id,
                    'name' => $evidence->uploader->name,
                    'email' => $evidence->uploader->email,
                ] : null,
            ],
        ], 201);
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk menambah borang.')) {
            return $denied;
        }

        $validated = $request->validate([
            'prodi_id' => 'required|exists:ref_units,id',
            'metric_id' => 'required|exists:mst_metrics,id',
            'pj' => 'required|in:Dekan,Kaprodi',
            'target_sasaran' => 'required|string',
        ], [
            'prodi_id.required' => 'prodi wajib dipilih',
            'prodi_id.exists' => 'prodi tidak valid',
            'metric_id.required' => 'indikator wajib dipilih',
            'metric_id.exists' => 'indikator tidak valid',
            'pj.required' => 'pj wajib dipilih',
            'pj.in' => 'pj tidak valid',
            'target_sasaran.required' => 'target sasaran wajib diisi',
        ]);

        $prodi = Unit::findOrFail($validated['prodi_id']);
        if ($prodi->level !== 'department') {
            return response()->json([
                'status' => 'error',
                'message' => 'Borang hanya dapat ditambahkan ke prodi.',
            ], 422);
        }

        $metric = MstMetric::with(['standard', 'parent'])->findOrFail($validated['metric_id']);
        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Borang hanya dapat menggunakan indikator.',
            ], 422);
        }

        $allProdis = $this->activeProdis();

        if ($allProdis->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Belum ada prodi aktif untuk menerima borang.',
            ], 422);
        }

        $existingItems = BorangItem::query()
            ->where('metric_id', $metric->id)
            ->get()
            ->keyBy(fn (BorangItem $item) => (string) $item->prodi_id);

        DB::transaction(function () use ($allProdis, $existingItems, $metric, $validated, $request): void {
            foreach ($allProdis as $department) {
                $existingItem = $existingItems->get((string) $department->id);

                if ($existingItem) {
                    $existingItem->update([
                        'pj' => $validated['pj'],
                        'target_sasaran' => trim($validated['target_sasaran']),
                    ]);

                    continue;
                }

                BorangItem::create([
                    'prodi_id' => $department->id,
                    'metric_id' => $metric->id,
                    'pj' => $validated['pj'],
                    'target_sasaran' => trim($validated['target_sasaran']),
                    'created_by' => $request->user()?->id,
                ]);
            }
        });

        $item = BorangItem::with(['metric.standard', 'metric.parent'])
            ->where('prodi_id', $prodi->id)
            ->where('metric_id', $metric->id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'message' => 'Borang berhasil diterapkan ke seluruh prodi.',
            'data' => $this->transformItem($item),
        ], 201);
    }

    public function destroy(Request $request, BorangItem $borangItem): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk menghapus borang.')) {
            return $denied;
        }

        BorangItem::query()
            ->where('metric_id', $borangItem->metric_id)
            ->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Borang berhasil dihapus dari seluruh prodi.',
            'data' => null,
        ]);
    }

    private function transformItem(BorangItem $item): array
    {
        $metric = $item->metric;
        $evidences = $item->evidences ?? collect();
        $ptks = $metric?->ptks ?? collect();

        $acceptedCount = $evidences->where('review_status', 'ACCEPTED')->count();
        $pendingCount = $evidences->where('review_status', 'PENDING')->count();
        $rejectedCount = $evidences->where('review_status', 'REJECTED')->count();

        $evidenceStatus = 'MISSING';
        if ($acceptedCount > 0) {
            $evidenceStatus = 'ACCEPTED';
        } elseif ($pendingCount > 0) {
            $evidenceStatus = 'PENDING';
        } elseif ($rejectedCount > 0) {
            $evidenceStatus = 'REJECTED';
        }

        return [
            'id' => $item->id,
            'prodi_id' => $item->prodi_id,
            'metric_id' => $metric?->id,
            'standard_id' => $metric?->standard?->id,
            'standard_name' => $metric?->standard?->name ?: '-',
            'iku' => $metric?->iku ?: '-',
            'ikt' => $metric?->ikt ?: '-',
            'sasaran_mutu' => $metric?->parent?->content ?: '-',
            'indikator' => $metric?->content ?: '-',
            'target_sasaran' => $item->target_sasaran ?: '-',
            'pj' => $item->pj ?: 'Kaprodi',
            'evidence_summary' => [
                'status' => $evidenceStatus,
                'total' => $evidences->count(),
                'accepted' => $acceptedCount,
                'pending' => $pendingCount,
                'rejected' => $rejectedCount,
            ],
            'ptk_summary' => [
                'total' => $ptks->count(),
                'open' => $ptks->whereIn('status', ['OPEN', 'REVISION_REQUIRED', 'RESPONDED', 'VERIFIED'])->count(),
            ],
        ];
    }
}
