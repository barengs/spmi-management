<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Services\StandardDocumentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StandardController extends Controller
{
    public function __construct(
        private readonly StandardDocumentImportService $documentImportService,
    ) {
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

    private function denyUnlessCanAudit(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->hasRole('SuperAdmin') || $user->can('standard.publish'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function denyUnlessCanReview(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! (
            $user->hasRole('SuperAdmin')
            || $user->hasRole('Pimpinan')
            || $user->hasRole('Kepala LPMI')
            || $user->hasRole('Wakil Rektor 1')
            || $user->hasRole('Wakil Rektor 2')
            || $user->hasRole('Wakil Rektor 3')
            || $user->hasRole('Rektor')
        )) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function resetApprovalFlow(MstStandard $standard): void
    {
        $standard->approval_stage = 'DRAFT';
        $standard->head_lpmi_approved_by = null;
        $standard->head_lpmi_approved_at = null;
        $standard->wr1_approved_by = null;
        $standard->wr1_approved_at = null;
        $standard->wr2_approved_by = null;
        $standard->wr2_approved_at = null;
        $standard->wr3_approved_by = null;
        $standard->wr3_approved_at = null;
        $standard->rector_approved_by = null;
        $standard->rector_approved_at = null;
    }

    private function currentApprovalLabel(MstStandard $standard): string
    {
        return match ($standard->approval_stage) {
            'HEAD_LPMI' => 'Kepala LPMI',
            'WR' => 'Wakil Rektor 1, 2, dan 3',
            'RECTOR' => 'Rektor',
            default => 'Tahap awal',
        };
    }

    private function approveAsCurrentActor(Request $request, MstStandard $standard): ?JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('SuperAdmin')) {
            if ($standard->approval_stage === 'HEAD_LPMI') {
                $standard->head_lpmi_approved_by = $user->id;
                $standard->head_lpmi_approved_at = now();
                $standard->approval_stage = 'WR';
                return null;
            }

            if ($standard->approval_stage === 'WR') {
                $standard->wr1_approved_by ??= $user->id;
                $standard->wr1_approved_at ??= now();
                $standard->wr2_approved_by ??= $user->id;
                $standard->wr2_approved_at ??= now();
                $standard->wr3_approved_by ??= $user->id;
                $standard->wr3_approved_at ??= now();
                $standard->approval_stage = 'RECTOR';
                return null;
            }

            if ($standard->approval_stage === 'RECTOR') {
                $standard->rector_approved_by = $user->id;
                $standard->rector_approved_at = now();
                return null;
            }
        }

        if ($standard->approval_stage === 'HEAD_LPMI') {
            if (! $user->hasRole('Kepala LPMI')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Standar saat ini menunggu persetujuan Kepala LPMI.',
                ], 403);
            }

            $standard->head_lpmi_approved_by = $user->id;
            $standard->head_lpmi_approved_at = now();
            $standard->approval_stage = 'WR';
            return null;
        }

        if ($standard->approval_stage === 'WR') {
            if ($user->hasRole('Wakil Rektor 1')) {
                $standard->wr1_approved_by = $user->id;
                $standard->wr1_approved_at = now();
            } elseif ($user->hasRole('Wakil Rektor 2')) {
                $standard->wr2_approved_by = $user->id;
                $standard->wr2_approved_at = now();
            } elseif ($user->hasRole('Wakil Rektor 3')) {
                $standard->wr3_approved_by = $user->id;
                $standard->wr3_approved_at = now();
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Standar saat ini menunggu persetujuan Wakil Rektor 1, 2, dan 3.',
                ], 403);
            }

            if ($standard->wr1_approved_at && $standard->wr2_approved_at && $standard->wr3_approved_at) {
                $standard->approval_stage = 'RECTOR';
            }

            return null;
        }

        if ($standard->approval_stage === 'RECTOR') {
            if (! $user->hasRole('Rektor')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Standar saat ini menunggu persetujuan Rektor.',
                ], 403);
            }

            $standard->rector_approved_by = $user->id;
            $standard->rector_approved_at = now();
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Tahap persetujuan standar tidak valid.',
        ], 422);
    }

    private function structureValidationError(MstStandard $standard): ?JsonResponse
    {
        $invalidStatements = $standard->structuralNodesWithoutContent();

        if ($invalidStatements->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Masih ada Poin Utama atau Sub Poin yang belum memiliki isi.',
            'errors' => [
                'nodes' => $invalidStatements->map(fn ($statement) => [
                    'id' => $statement->id,
                    'content' => $statement->content,
                    'type' => $statement->type,
                ])->values(),
            ],
        ], 422);
    }

    private function reviewValidationError(MstStandard $standard): ?JsonResponse
    {
        $rejectedMetrics = MstMetric::where('standard_id', $standard->id)
            ->where('review_status', 'REJECTED')
            ->orderBy('id')
            ->get(['id', 'type', 'content', 'review_action', 'review_comment']);

        if ($rejectedMetrics->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Standar tidak dapat diterbitkan karena masih ada header atau node yang ditolak reviewer.',
            'errors' => [
                'metrics' => $rejectedMetrics->map(fn (MstMetric $metric) => [
                    'id' => $metric->id,
                    'type' => $metric->type,
                    'content' => $metric->content,
                    'review_action' => $metric->review_action,
                    'review_comment' => $metric->review_comment,
                ])->values(),
            ],
        ], 422);
    }

    private function pendingReviewValidationError(MstStandard $standard): ?JsonResponse
    {
        $pendingMetrics = MstMetric::where('standard_id', $standard->id)
            ->where('review_status', 'PENDING')
            ->orderBy('id')
            ->get(['id', 'type', 'content']);

        if ($pendingMetrics->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Standar belum dapat dikirim ke pimpinan karena masih ada node yang belum dicek auditor.',
            'errors' => [
                'metrics' => $pendingMetrics->map(fn (MstMetric $metric) => [
                    'id' => $metric->id,
                    'type' => $metric->type,
                    'content' => $metric->content,
                ])->values(),
            ],
        ], 422);
    }

    /**
     * Display a listing of the standards.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MstStandard::query();

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('periode_tahun')) {
            $query->where('periode_tahun', $request->periode_tahun);
        }

        $standards = $query->orderByDesc('created_at')
                           ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $standards,
        ]);
    }

    /**
     * Store a newly created standard.
     */
    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.create', 'Anda tidak memiliki hak akses untuk menambah standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'category'           => 'required|in:SN-Dikti,Institusi',
            'periode_tahun'      => 'nullable|integer',
            'is_active'          => 'boolean',
            'referensi_regulasi' => 'nullable|string',
        ]);

        $standard = MstStandard::create($validated);
        $this->resetApprovalFlow($standard);
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dibuat.',
            'data'    => $standard,
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.create', 'Anda tidak memiliki hak akses untuk mengimpor standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:SN-Dikti,Institusi',
            'periode_tahun' => 'nullable|integer',
            'is_active' => 'boolean',
            'referensi_regulasi' => 'nullable|string',
            'file' => 'required|file|mimes:pdf|max:20480',
            'structure_tree' => 'nullable',
            'extracted_text' => 'nullable|string',
        ]);

        $uploadedFile = $request->file('file');
        $baseName = Str::slug(pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'standar';
        $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $uploadedFile->getClientOriginalExtension());

        $decodedStructureTree = null;
        if ($request->filled('structure_tree')) {
            $decodedStructureTree = json_decode((string) $request->input('structure_tree'), true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decodedStructureTree)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Format struktur standar tidak valid.',
                ], 422);
            }
        }

        $standard = null;
        $path = null;

        try {
            DB::beginTransaction();

            $standard = MstStandard::create([
                'name' => $validated['name'],
                'category' => $validated['category'],
                'periode_tahun' => $validated['periode_tahun'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'referensi_regulasi' => $validated['referensi_regulasi'] ?? null,
                'status' => 'DRAFT',
            ]);

            $directory = sprintf('standards/standard-%s/source-documents', $standard->id);
            $path = $uploadedFile->storeAs($directory, $storedName, 'local');

            $standard->forceFill([
                'source_document_path' => $path,
                'source_document_original_name' => $uploadedFile->getClientOriginalName(),
                'source_document_stored_name' => $storedName,
                'source_document_mime_type' => $uploadedFile->getMimeType(),
                'source_document_size_bytes' => $uploadedFile->getSize(),
                'imported_from_document_at' => now(),
            ]);
            $this->resetApprovalFlow($standard);
            $standard->save();

            $summary = $this->documentImportService->import(
                $standard,
                $decodedStructureTree,
                $validated['extracted_text'] ?? null,
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Dokumen standar berhasil diimpor beserta struktur poin-poinnya.',
                'data' => [
                    ...$standard->fresh()->toArray(),
                    'import_summary' => $summary,
                ],
            ], 201);
        } catch (\Throwable $exception) {
            DB::rollBack();

            if ($path) {
                Storage::disk('local')->delete($path);
            }

            if ($standard?->exists) {
                $standard->forceDelete();
            }

            throw $exception;
        }
    }

    /**
     * Display the specified standard.
     */
    public function show($id): JsonResponse
    {
        $standard = MstStandard::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $standard,
        ]);
    }

    public function downloadSourceDocument($id): StreamedResponse
    {
        $standard = MstStandard::findOrFail($id);

        abort_unless($standard->source_document_path, 404);
        abort_unless(Storage::disk('local')->exists($standard->source_document_path), 404);

        return Storage::disk('local')->download(
            $standard->source_document_path,
            $standard->source_document_original_name ?? $standard->source_document_stored_name
        );
    }

    /**
     * Update the specified standard.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk mengubah standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengubah standar yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $validated = $request->validate([
            'name'               => 'sometimes|required|string|max:255',
            'category'           => 'sometimes|required|in:SN-Dikti,Institusi',
            'periode_tahun'      => 'nullable|integer',
            'is_active'          => 'boolean',
            'referensi_regulasi' => 'nullable|string',
        ]);

        $standard->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil diperbarui.',
            'data'    => $standard,
        ]);
    }

    /**
     * Remove the specified standard (Soft Delete).
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.delete', 'Anda tidak memiliki hak akses untuk menghapus standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus standar yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $standard->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dihapus.',
            'data'    => null,
        ]);
    }

    /**
     * Submit the specified standard for approval (Ajukan).
     */
    public function submit(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.publish', 'Anda tidak memiliki hak akses untuk mengajukan standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if (!in_array($standard->status, ['DRAFT', 'REVISI'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya standar berstatus DRAFT atau REVISI yang dapat diajukan.'
            ], 400);
        }

        if ($error = $this->structureValidationError($standard)) {
            return $error;
        }

        $standard->status = 'WAITING_APPROVAL';
        $standard->approval_stage = 'HEAD_LPMI';
        $standard->submitted_by = auth()->id();
        $standard->approved_by = null;
        $standard->review_submitted_by = null;
        $standard->review_submitted_at = null;
        $standard->reject_reason = null;
        $this->resetApprovalFlow($standard);
        $standard->approval_stage = 'HEAD_LPMI';
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil diajukan ke Kepala LPMI.',
            'data'    => $standard,
        ]);
    }

    /**
     * Approve the specified standard (Setujui -> TERBIT).
     */
    public function approve(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReview($request, 'Anda tidak memiliki hak akses untuk menyetujui standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar tidak dalam status Menunggu Persetujuan.'
            ], 400);
        }

        if ($error = $this->structureValidationError($standard)) {
            return $error;
        }

        if ($error = $this->approveAsCurrentActor($request, $standard)) {
            return $error;
        }

        if ($standard->approval_stage === 'RECTOR' && $standard->rector_approved_at) {
            $standard->status = 'TERBIT';
            $standard->approval_stage = 'FINAL';
            $standard->approved_by = auth()->id();
            $standard->reject_reason = null;
            $standard->save();

            return response()->json([
                'status'  => 'success',
                'message' => 'Standar Mutu disetujui Rektor dan langsung diterbitkan.',
                'data'    => $standard,
            ]);
        }

        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Persetujuan berhasil direkam. Tahap berikutnya: ' . $this->currentApprovalLabel($standard) . '.',
            'data'    => $standard,
        ]);
    }

    /**
     * Reject the specified standard (Tolak -> REVISI).
     */
    public function reject(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReview($request, 'Anda tidak memiliki hak akses untuk menolak standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'reason' => 'required|string'
        ]);

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar tidak dalam status Menunggu Persetujuan.'
            ], 400);
        }

        $standard->status = 'REVISI';
        $standard->approval_stage = 'REVISI';
        $standard->reject_reason = $validated['reason'];
        $this->resetApprovalFlow($standard);
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu telah ditolak dan dikembalikan untuk direvisi.',
            'data'    => $standard,
        ]);
    }

    public function submitReview(Request $request, $id): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Alur review auditor sudah tidak dipakai. Gunakan alur persetujuan berjenjang Kepala LPMI, Wakil Rektor, lalu Rektor.',
        ], 410);
    }
}
