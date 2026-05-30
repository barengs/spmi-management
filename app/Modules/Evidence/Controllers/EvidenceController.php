<?php

namespace App\Modules\Evidence\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Core\Models\ActivityLog;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenceController extends Controller
{
    private function isAuditLockedForEvidence(TrxEvidence $evidence): bool
    {
        $prodiId = $evidence->borangItem?->prodi_id;

        if (! $prodiId) {
            return false;
        }

        return AuditSchedule::query()
            ->where('prodi_id', $prodiId)
            ->latest('scheduled_start')
            ->value('audit_period_status') === 'ENDED';
    }

    public function auditIndex(Request $request): JsonResponse
    {
        if (! $request->user()?->can('audit.score.update')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melakukan review audit.',
            ], 403);
        }

        $evidences = TrxEvidence::query()
            ->with([
                'metric:id,standard_id,content',
                'metric.standard:id,name,category,periode_tahun',
                'borangItem.prodi:id,parent_id,name,code,level',
                'uploader:id,name,email,unit_id',
                'uploader.unit:id,parent_id,name,code,level',
                'reviewer:id,name,email',
            ])
            ->latest()
            ->get()
            ->map(fn (TrxEvidence $evidence) => $this->transformEvidence($evidence));

        return response()->json([
            'status' => 'success',
            'data' => $evidences,
        ]);
    }

    public function index($metricId): JsonResponse
    {
        $metric = MstMetric::findOrFail($metricId);

        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Repository bukti hanya tersedia untuk node Indicator.',
            ], 422);
        }

        $evidences = TrxEvidence::query()
            ->with(['uploader:id,name,email', 'borangItem.prodi:id,parent_id,name,code,level'])
            ->where('metric_id', $metricId)
            ->latest()
            ->get()
            ->map(fn (TrxEvidence $evidence) => $this->transformEvidence($evidence));

        return response()->json([
            'status' => 'success',
            'data' => $evidences,
        ]);
    }

    public function store(Request $request, $metricId): JsonResponse
    {
        if (! $request->user()?->can('evidence.upload')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengunggah bukti.',
            ], 403);
        }

        $metric = MstMetric::with('standard')->findOrFail($metricId);

        if ($metric->type !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti hanya dapat diunggah ke node Indicator.',
            ], 422);
        }

        $validated = $request->validate([
            'source_type' => 'required|in:file,link',
            'borang_item_id' => 'nullable|exists:borang_items,id',
            'title' => 'nullable|string|max:255',
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
            'borang_item_id' => $validated['borang_item_id'] ?? null,
            'uploaded_by' => $request->user()->id,
            'source_type' => $validated['source_type'],
            'title' => $validated['title'] ?? null,
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
            $baseName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'bukti';
            $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $file->getClientOriginalExtension());
            $directory = sprintf('evidences/metric-%s', $metric->id);
            $path = $file->storeAs($directory, $storedName, 'local');

            $payload['file_path'] = $path;
            $payload['original_name'] = $file->getClientOriginalName();
            $payload['stored_name'] = $storedName;
            $payload['mime_type'] = $file->getMimeType();
            $payload['size_bytes'] = $file->getSize();
            $payload['title'] = $payload['title'] ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        }

        $evidence = TrxEvidence::create($payload)->load('uploader:id,name,email');

        ActivityLog::record(
            'pelaksanaan.evidence_uploaded',
            TrxEvidence::class,
            $evidence->id,
            null,
            [
                'borang_item_id' => $evidence->borang_item_id,
                'metric_id' => $evidence->metric_id,
                'source_type' => $evidence->source_type,
                'title' => $evidence->title,
                'review_status' => $evidence->review_status,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti berhasil disimpan ke repository.',
            'data' => $this->transformEvidence($evidence),
        ], 201);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        if (! $request->user()?->can('evidence.delete')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk menghapus bukti.',
            ], 403);
        }

        $evidence = TrxEvidence::with(['metric.standard', 'borangItem'])->findOrFail($id);
        $oldData = $evidence->only(['borang_item_id', 'metric_id', 'source_type', 'title', 'review_status']);

        if ($this->isAuditLockedForEvidence($evidence)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode audit sudah ditutup. Bukti tidak dapat diubah atau dihapus lagi.',
            ], 423);
        }

        if ($evidence->file_path) {
            Storage::disk('local')->delete($evidence->file_path);
        }

        $evidence->delete();

        ActivityLog::record(
            'pelaksanaan.evidence_deleted',
            TrxEvidence::class,
            $id,
            $oldData,
            null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti berhasil dihapus.',
            'data' => null,
        ]);
    }

    public function review(Request $request, $id): JsonResponse
    {
        if (! $request->user()?->can('audit.score.update')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melakukan review audit.',
            ], 403);
        }

        $evidence = TrxEvidence::with([
            'metric.standard',
            'borangItem',
            'uploader:id,name,email',
            'reviewer:id,name,email',
        ])->findOrFail($id);

        if ($this->isAuditLockedForEvidence($evidence)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode audit sudah ditutup. Auditor tidak dapat mengubah hasil review lagi.',
            ], 423);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['accept', 'reject'])],
            'comment' => 'nullable|string',
        ]);
        $oldReviewStatus = $evidence->review_status;
        $oldReviewComment = $evidence->review_comment;

        if ($validated['action'] === 'reject' && blank($validated['comment'] ?? null)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Komentar auditor wajib diisi saat menolak bukti.',
            ], 422);
        }

        $evidence->review_status = $validated['action'] === 'accept' ? 'ACCEPTED' : 'REJECTED';
        $evidence->review_comment = $validated['comment'] ?? $evidence->review_comment;
        $evidence->reviewed_by = $request->user()->id;
        $evidence->reviewed_at = now();
        $evidence->save();

        ActivityLog::record(
            'audit.evidence_reviewed',
            TrxEvidence::class,
            $evidence->id,
            [
                'review_status' => $oldReviewStatus,
                'review_comment' => $oldReviewComment,
            ],
            [
                'review_status' => $evidence->review_status,
                'review_comment' => $evidence->review_comment,
                'reviewed_by' => $evidence->reviewed_by,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => $validated['action'] === 'accept'
                ? 'Bukti audit diterima.'
                : 'Bukti audit ditolak dan komentar auditor disimpan.',
            'data' => $this->transformEvidence($evidence->fresh(['metric.standard', 'uploader:id,name,email', 'reviewer:id,name,email'])),
        ]);
    }

    public function download($id): StreamedResponse
    {
        $evidence = TrxEvidence::findOrFail($id);

        abort_if($evidence->source_type !== 'file' || ! $evidence->file_path, 404);
        abort_unless(Storage::disk('local')->exists($evidence->file_path), 404);

        return Storage::disk('local')->download(
            $evidence->file_path,
            $evidence->original_name ?? $evidence->stored_name
        );
    }

    private function transformEvidence(TrxEvidence $evidence): array
    {
        return [
            'id' => $evidence->id,
            'metric_id' => $evidence->metric_id,
            'borang_item_id' => $evidence->borang_item_id,
            'source_type' => $evidence->source_type,
            'title' => $evidence->title,
            'notes' => $evidence->notes,
            'link_url' => $evidence->link_url,
            'original_name' => $evidence->original_name,
            'stored_name' => $evidence->stored_name,
            'mime_type' => $evidence->mime_type,
            'size_bytes' => $evidence->size_bytes,
            'review_status' => $evidence->review_status,
            'review_comment' => $evidence->review_comment,
            'reviewed_at' => $evidence->reviewed_at?->toISOString(),
            'is_previewable' => $evidence->source_type === 'link' || str_starts_with($evidence->mime_type ?? '', 'application/pdf'),
            'download_url' => $evidence->source_type === 'file' ? "/api/v1/evidences/{$evidence->id}/download" : null,
            'uploader' => $evidence->uploader ? [
                'id' => $evidence->uploader->id,
                'name' => $evidence->uploader->name,
                'email' => $evidence->uploader->email,
                'unit_id' => $evidence->uploader->unit_id,
                'unit' => $evidence->uploader->relationLoaded('unit') && $evidence->uploader->unit ? [
                    'id' => $evidence->uploader->unit->id,
                    'parent_id' => $evidence->uploader->unit->parent_id,
                    'name' => $evidence->uploader->unit->name,
                    'code' => $evidence->uploader->unit->code,
                    'level' => $evidence->uploader->unit->level,
                ] : null,
            ] : null,
            'borang_item' => $evidence->relationLoaded('borangItem') && $evidence->borangItem ? [
                'id' => $evidence->borangItem->id,
                'prodi' => $evidence->borangItem->relationLoaded('prodi') && $evidence->borangItem->prodi ? [
                    'id' => $evidence->borangItem->prodi->id,
                    'parent_id' => $evidence->borangItem->prodi->parent_id,
                    'name' => $evidence->borangItem->prodi->name,
                    'code' => $evidence->borangItem->prodi->code,
                    'level' => $evidence->borangItem->prodi->level,
                ] : null,
            ] : null,
            'reviewer' => $evidence->reviewer ? [
                'id' => $evidence->reviewer->id,
                'name' => $evidence->reviewer->name,
                'email' => $evidence->reviewer->email,
            ] : null,
            'metric' => $evidence->relationLoaded('metric') && $evidence->metric ? [
                'id' => $evidence->metric->id,
                'content' => $evidence->metric->content,
                'standard' => $evidence->metric->relationLoaded('standard') && $evidence->metric->standard ? [
                    'id' => $evidence->metric->standard->id,
                    'name' => $evidence->metric->standard->name,
                    'category' => $evidence->metric->standard->category,
                    'periode_tahun' => $evidence->metric->standard->periode_tahun,
                ] : null,
            ] : null,
            'created_at' => $evidence->created_at?->toISOString(),
        ];
    }
}
