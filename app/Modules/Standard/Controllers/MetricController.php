<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MetricController extends Controller
{
    private function denyUnlessCanReview(Request $request, string $message): ?JsonResponse
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

    private function hierarchyValidationError(array $payload, ?MstMetric $metric = null): ?JsonResponse
    {
        $resolvedParentId = array_key_exists('parent_id', $payload)
            ? $payload['parent_id']
            : $metric?->parent_id;
        $resolvedType = $payload['type'] ?? $metric?->type;
        $parent = $resolvedParentId ? MstMetric::findOrFail($resolvedParentId) : null;

        if ($resolvedParentId === null && $resolvedType === 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Indicator tidak dapat dibuat sebagai node akar.',
            ], 422);
        }

        if ($parent?->type === 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Indicator tidak dapat memiliki child node.',
            ], 422);
        }

        if ($parent?->type === 'Statement' && $resolvedType !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Child dari Statement wajib bertipe Indicator.',
            ], 422);
        }

        if ($parent?->type === 'Header' && $resolvedType === 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Indicator tidak dapat langsung berada di bawah Header. Tambahkan Statement terlebih dahulu.',
            ], 422);
        }

        if (! $metric) {
            return null;
        }

        if ($resolvedType === 'Indicator' && $metric->children()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Node yang sudah memiliki child tidak dapat diubah menjadi Indicator.',
            ], 422);
        }

        if ($resolvedType === 'Statement' && $metric->children()->where('type', '!=', 'Indicator')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Statement hanya boleh memiliki child bertipe Indicator.',
            ], 422);
        }

        if ($resolvedType === 'Header' && $metric->children()->where('type', 'Indicator')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Header tidak boleh memiliki child Indicator secara langsung.',
            ], 422);
        }

        return null;
    }

    private function resetReviewState(MstMetric $metric): void
    {
        $metric->forceFill([
            'review_status' => 'ACCEPTED',
            'review_action' => null,
            'review_comment' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ])->save();
    }

    private function cascadeResetReviewState(MstMetric $metric): void
    {
        $this->resetReviewState($metric);

        foreach ($metric->children as $child) {
            $this->cascadeResetReviewState($child);
        }
    }

    private function applyRejectedState(MstMetric $metric, Request $request, string $comment, string $reviewAction): void
    {
        $metric->forceFill([
            'review_status' => 'REJECTED',
            'review_action' => $reviewAction,
            'review_comment' => $comment,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();
    }

    private function cascadeRejectedState(MstMetric $metric, Request $request, string $comment, string $reviewAction): void
    {
        $this->applyRejectedState($metric, $request, $comment, $reviewAction);

        foreach ($metric->children as $child) {
            $this->cascadeRejectedState($child, $request, $comment, $reviewAction);
        }
    }

    /**
     * Dapatkan hirarki indikator/metrik dari sebuah standar.
     */
    public function tree($standard_id): JsonResponse
    {
        // Pastikan standar ada
        MstStandard::findOrFail($standard_id);

        $metrics = MstMetric::where('standard_id', $standard_id)
            ->whereNull('parent_id')
            ->orderBy('order')
            ->with('childrenRecursive')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $metrics,
        ]);
    }

    /**
     * Tambah node baru pada struktur standar.
     */
    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk mengubah struktur standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'standard_id' => 'required|exists:mst_standards,id',
            'parent_id'   => 'nullable|exists:mst_metrics,id',
            'content'     => 'required|string',
            'type'        => 'required|in:Header,Statement,Indicator',
            'order'       => 'nullable|integer',
        ]);

        if (empty($validated['order'])) {
            $validated['order'] = MstMetric::where('standard_id', $validated['standard_id'])
                ->where('parent_id', $validated['parent_id'])
                ->max('order') + 1;
        }

        if ($error = $this->hierarchyValidationError($validated)) {
            return $error;
        }

        $standard = MstStandard::findOrFail($validated['standard_id']);
        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat merubah struktur dari Standar Mutu yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $metric = MstMetric::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Komponen standar berhasil ditambahkan.',
            'data'    => $metric,
        ], 201);
    }

    /**
     * Update content atau hierarki sebuah node.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.update', 'Anda tidak memiliki hak akses untuk mengubah struktur standar.')) {
            return $denied;
        }

        $metric = MstMetric::findOrFail($id);

        if (in_array($metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengubah node pada Standar Mutu yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:mst_metrics,id',
            'content'   => 'sometimes|required|string',
            'type'      => 'sometimes|required|in:Header,Statement,Indicator',
            'order'     => 'nullable|integer',
        ]);

        // Pencegahan circular reference jika mengubah parent_id
        if (array_key_exists('parent_id', $validated) && $validated['parent_id'] !== $metric->parent_id) {
            if ($validated['parent_id'] == $metric->id) {
                throw ValidationException::withMessages(['parent_id' => 'Node metrik tidak boleh menjadi parent untuk dirinya sendiri.']);
            }
            
            // Periksa nenek moyang ke atas
            $currentParent = MstMetric::find($validated['parent_id']);
            while ($currentParent) {
                if ($currentParent->id == $metric->id) {
                    throw ValidationException::withMessages(['parent_id' => 'Circular reference: Node parent ini berada di dalam node yang sedang diubah.']);
                }
                $currentParent = $currentParent->parent;
            }
        }

        if ($error = $this->hierarchyValidationError($validated, $metric)) {
            return $error;
        }

        $metric->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Komponen standar berhasil diupdate.',
            'data'    => $metric,
        ]);
    }

    /**
     * Hapus node (otomatis cascade on delete di DB jika didefiniskan, tapi karena softdelete kita perlu trigger manual recursive jika diperlukan)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.delete', 'Anda tidak memiliki hak akses untuk menghapus struktur standar.')) {
            return $denied;
        }

        $metric = MstMetric::findOrFail($id);
        
        if (in_array($metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus node dari Standar Mutu yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        // Menghapus node ini akan secara otomatis menghapus anak-anaknya berkat `cascadeOnDelete` foreign key pada DB, 
        // namun untuk softdeletes Eloquent kita harus menginisiasinya secara eksplisit jika parent_id dan standard_id tidak null
        $this->deleteMetricAndChildren($metric);

        return response()->json([
            'status'  => 'success',
            'message' => 'Komponen standar beserta seluruh sub-hierarkinya berhasil dihapus.',
            'data'    => null,
        ]);
    }

    private function deleteMetricAndChildren(MstMetric $metric)
    {
        foreach ($metric->children as $child) {
            $this->deleteMetricAndChildren($child);
        }
        $metric->delete();
    }

    public function review(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReview($request, 'Anda tidak memiliki hak akses untuk melakukan review standar.')) {
            return $denied;
        }

        $metric = MstMetric::with('childrenRecursive')->findOrFail($id);

        if ($metric->standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Review node hanya dapat dilakukan saat standar menunggu persetujuan.',
            ], 400);
        }

        $validated = $request->validate([
            'action' => 'required|in:accept,reject',
            'comment' => 'nullable|string',
            'review_action' => 'nullable|in:REMOVE,UPDATE',
        ]);

        if ($validated['action'] === 'reject') {
            if (blank($validated['comment'] ?? null)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Komentar reviewer wajib diisi saat menolak node.',
                ], 422);
            }

            if (blank($validated['review_action'] ?? null)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Pilih tindak lanjut node: hapus atau ubah konten.',
                ], 422);
            }

            if ($metric->type === 'Header') {
                $this->cascadeRejectedState($metric, $request, $validated['comment'], $validated['review_action']);
            } else {
                $this->applyRejectedState($metric, $request, $validated['comment'], $validated['review_action']);
            }

            return response()->json([
                'status' => 'success',
                'message' => $metric->type === 'Header'
                    ? 'Header ditolak dan seluruh node turunannya ikut ditandai untuk revisi.'
                    : 'Node standar ditandai untuk revisi.',
                'data' => $metric->fresh(),
            ]);
        }

        if ($metric->type === 'Header') {
            $this->cascadeResetReviewState($metric);
        } else {
            $this->resetReviewState($metric);
        }

        return response()->json([
            'status' => 'success',
            'message' => $metric->type === 'Header'
                ? 'Header dan seluruh node turunannya ditandai sudah dicek auditor.'
                : 'Node standar ditandai sudah dicek auditor.',
            'data' => $metric->fresh(),
        ]);
    }
}
