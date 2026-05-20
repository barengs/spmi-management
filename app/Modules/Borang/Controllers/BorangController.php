<?php

namespace App\Modules\Borang\Controllers;

use App\Modules\Audit\Models\AuditSchedule;
use App\Http\Controllers\Controller;
use App\Modules\Borang\Models\BorangItem;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BorangController extends Controller
{
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

        $canManageBorang = $user?->can('standard.update');
        $canAuditBorang = $user?->can('audit.score.update');

        if (! $canManageBorang && ! $canAuditBorang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melihat borang.',
            ], 403);
        }

        abort_if($prodi->level !== 'department', 404);

        if (! $canManageBorang && $canAuditBorang) {
            $isAssigned = AuditSchedule::query()
                ->where('prodi_id', $prodi->id)
                ->where(function ($query) use ($user) {
                    $query->where('auditor_id', $user->id)
                        ->orWhere('lead_auditor_id', $user->id);
                })
                ->exists();

            if (! $isAssigned) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda hanya dapat melihat borang untuk prodi yang ditugaskan kepada Anda.',
                ], 403);
            }
        }

        $this->syncSharedBorangTemplate($user?->id);

        $items = BorangItem::with([
            'metric.standard',
            'metric.parent',
            'metric.evidences:id,metric_id,review_status,reviewed_at,created_at',
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
        $evidences = $metric?->evidences ?? collect();
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
