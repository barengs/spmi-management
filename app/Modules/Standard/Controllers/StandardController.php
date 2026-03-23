<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StandardController extends Controller
{
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

        if (! $user || ! ($user->hasRole('SuperAdmin') || $user->hasRole('Auditor') || $user->can('standard.publish'))) {
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

        if (! $user || ! ($user->hasRole('SuperAdmin') || $user->hasRole('Pimpinan'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function structureValidationError(MstStandard $standard): ?JsonResponse
    {
        $invalidStatements = $standard->statementsWithoutIndicators();

        if ($invalidStatements->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Masih ada Statement yang belum memiliki minimal satu Indicator.',
            'errors' => [
                'statements' => $invalidStatements->map(fn ($statement) => [
                    'id' => $statement->id,
                    'content' => $statement->content,
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

        $standards = $query->orderBy('periode_tahun', 'desc')
                           ->orderBy('name')
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

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dibuat.',
            'data'    => $standard,
        ], 201);
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

        MstMetric::where('standard_id', $standard->id)->update([
            'review_status' => 'PENDING',
            'review_action' => null,
            'review_comment' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        $standard->status = 'WAITING_APPROVAL';
        $standard->submitted_by = auth()->id();
        $standard->approved_by = null;
        $standard->review_submitted_by = null;
        $standard->review_submitted_at = null;
        $standard->reject_reason = null;
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil diajukan untuk ditinjau.',
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

        if (! $standard->review_submitted_at) {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar belum dapat diterbitkan karena auditor belum mengirimkan hasil review ke pimpinan.',
            ], 422);
        }

        if ($error = $this->pendingReviewValidationError($standard)) {
            return $error;
        }

        if ($error = $this->reviewValidationError($standard)) {
            return $error;
        }

        $standard->status = 'TERBIT';
        $standard->approved_by = auth()->id();
        $standard->reject_reason = null;
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil Diterbitkan.',
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

        if (! MstMetric::where('standard_id', $standard->id)->where('review_status', 'REJECTED')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tandai minimal satu header atau node untuk revisi sebelum mengembalikan standar ke admin.',
            ], 422);
        }

        $standard->status = 'REVISI';
        $standard->reject_reason = $validated['reason'];
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu telah ditolak dan dikembalikan untuk direvisi.',
            'data'    => $standard,
        ]);
    }

    public function submitReview(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanAudit($request, 'Anda tidak memiliki hak akses untuk mengirim review auditor ke pimpinan.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar tidak dalam status menunggu review.',
            ], 400);
        }

        if ($error = $this->pendingReviewValidationError($standard)) {
            return $error;
        }

        if ($error = $this->reviewValidationError($standard)) {
            return $error;
        }

        $standard->review_submitted_by = $request->user()->id;
        $standard->review_submitted_at = now();
        $standard->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Hasil review auditor berhasil dikirim ke pimpinan.',
            'data' => $standard,
        ]);
    }
}
