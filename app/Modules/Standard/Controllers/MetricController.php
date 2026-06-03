<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\ActivityLog;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MetricTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MetricController extends Controller
{
    private function defaultContentFormatForType(string $type): string
    {
        return match ($type) {
            'Header' => 'SUB_POINT',
            'Statement' => 'INDICATOR',
            default => 'LONG_TEXT',
        };
    }

    private function logMetricActivity(string $action, MstMetric $metric, mixed $oldData = null, mixed $newData = null): void
    {
        ActivityLog::record($action, MstMetric::class, $metric->id, $oldData, $newData);
    }

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

    private function denyUnlessCanDraft(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->can('standard.create') || $user->can('standard.update') || $user->can('standard.delete'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function denyUnlessCanReadStandards(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        if (
            $user->hasRole('SuperAdmin')
            || $user->can('standard.view')
            || $user->can('standard.create')
            || $user->can('standard.update')
            || $user->can('standard.delete')
            || $user->can('standard.publish')
            || $user->can('report.export')
        ) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => $message,
        ], 403);
    }

    private function hierarchyValidationError(array $payload, ?MstMetric $metric = null): ?JsonResponse
    {
        $resolvedParentId = array_key_exists('parent_id', $payload)
            ? $payload['parent_id']
            : $metric?->parent_id;
        $resolvedType = $payload['type'] ?? $metric?->type;
        $resolvedContentFormat = $payload['content_format']
            ?? $metric?->content_format
            ?? $this->defaultContentFormatForType($resolvedType);
        $parent = $resolvedParentId ? MstMetric::findOrFail($resolvedParentId) : null;

        if ($resolvedParentId === null && $resolvedType === 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Isi tidak dapat dibuat sebagai node akar.',
            ], 422);
        }

        if ($parent?->type === 'Indicator' && ($parent->content_format ?? $this->defaultContentFormatForType($parent->type)) !== 'INDICATOR') {
            return response()->json([
                'status' => 'error',
                'message' => 'Isi bertipe teks panjang atau tabel tidak dapat memiliki poin turunan.',
            ], 422);
        }

        if ($parent?->type === 'Statement' && ($parent->content_format ?? $this->defaultContentFormatForType($parent->type)) !== 'INDICATOR') {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub Poin bertipe teks panjang atau tabel tidak dapat memiliki child isi.',
            ], 422);
        }

        if ($parent?->type === 'Statement' && $resolvedType !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Child dari Sub Poin wajib bertipe Isi.',
            ], 422);
        }

        if ($parent?->type === 'Indicator' && $resolvedType !== 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Poin turunan wajib bertipe Isi.',
            ], 422);
        }

        if ($parent?->type === 'Header' && $resolvedType === 'Indicator') {
            return response()->json([
                'status' => 'error',
                'message' => 'Isi tidak dapat langsung berada di bawah Poin Utama. Tambahkan Sub Poin terlebih dahulu.',
            ], 422);
        }

        if (! $metric) {
            return null;
        }

        if ($resolvedType === 'Indicator' && $resolvedContentFormat !== 'INDICATOR' && $metric->children()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Isi yang sudah memiliki poin turunan harus tetap menggunakan bentuk konten Poin-Poin.',
            ], 422);
        }

        if ($resolvedType === 'Statement' && in_array($resolvedContentFormat, ['LONG_TEXT', 'TABLE'], true) && $metric->children()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub Poin yang sudah memiliki isi tidak dapat diubah menjadi teks panjang atau tabel.',
            ], 422);
        }

        if ($resolvedType === 'Statement' && $metric->children()->where('type', '!=', 'Indicator')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub Poin hanya boleh memiliki child bertipe Isi.',
            ], 422);
        }

        if ($resolvedType === 'Indicator' && $metric->children()->where('type', '!=', 'Indicator')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Poin-Poin hanya boleh memiliki poin turunan bertipe Isi.',
            ], 422);
        }

        if ($resolvedType === 'Header' && $metric->children()->where('type', 'Indicator')->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Poin Utama tidak boleh memiliki child Isi secara langsung.',
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
    public function tree(Request $request, $standard_id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReadStandards($request, 'Anda tidak memiliki hak akses untuk melihat struktur standar.')) {
            return $denied;
        }

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
        if ($denied = $this->denyUnlessCanDraft($request, 'Anda tidak memiliki hak akses untuk mengubah struktur standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'standard_id' => 'required|exists:mst_standards,id',
            'parent_id'   => 'nullable|exists:mst_metrics,id',
            'content'     => 'required|string',
            'type'        => 'required|in:Header,Statement,Indicator',
            'content_format' => 'nullable|in:SUB_POINT,INDICATOR,LONG_TEXT,TABLE',
            'order'       => 'nullable|integer',
        ]);

        $validated['pj'] = null;
        $validated['content_format'] = $validated['content_format'] ?? $this->defaultContentFormatForType($validated['type']);

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
        $this->logMetricActivity('POST', $metric, null, $metric->toArray());

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
        if ($denied = $this->denyUnlessCanDraft($request, 'Anda tidak memiliki hak akses untuk mengubah struktur standar.')) {
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
            'content_format' => 'nullable|in:SUB_POINT,INDICATOR,LONG_TEXT,TABLE',
            'order'     => 'nullable|integer',
        ]);

        if (! array_key_exists('content_format', $validated) && array_key_exists('type', $validated)) {
            $validated['content_format'] = $this->defaultContentFormatForType($validated['type']);
        }

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

        $validated['pj'] = null;

        $oldData = $metric->toArray();
        $metric->update($validated);
        $this->logMetricActivity('PUT', $metric, $oldData, $metric->fresh()->toArray());

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
        if ($denied = $this->denyUnlessCanDraft($request, 'Anda tidak memiliki hak akses untuk menghapus struktur standar.')) {
            return $denied;
        }

        $metric = MstMetric::findOrFail($id);
        
        if (in_array($metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus node dari Standar Mutu yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        if ($this->hasAppliedIndicator($metric)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Node tidak dapat dihapus karena terdapat indikator yang sudah diterapkan melalui target atau bukti audit.',
            ], 422);
        }

        // Menghapus node ini akan secara otomatis menghapus anak-anaknya berkat `cascadeOnDelete` foreign key pada DB, 
        // namun untuk softdeletes Eloquent kita harus menginisiasinya secara eksplisit jika parent_id dan standard_id tidak null
        $oldData = $metric->load('childrenRecursive')->toArray();
        $this->deleteMetricAndChildren($metric);
        $this->logMetricActivity('DELETE', $metric, $oldData, null);

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

    private function hasAppliedIndicator(MstMetric $metric): bool
    {
        $metric->loadMissing('children');

        if ($metric->type === 'Indicator') {
            return MetricTarget::where('metric_id', $metric->id)->exists()
                || TrxEvidence::where('metric_id', $metric->id)->exists();
        }

        foreach ($metric->children as $child) {
            if ($this->hasAppliedIndicator($child)) {
                return true;
            }
        }

        return false;
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

            $this->logMetricActivity('REVIEW', $metric, null, [
                'review_status' => 'REJECTED',
                'review_action' => $validated['review_action'],
                'review_comment' => $validated['comment'],
            ]);

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

        $this->logMetricActivity('REVIEW', $metric, null, [
            'review_status' => $validated['action'] === 'reject' ? 'REJECTED' : 'ACCEPTED',
            'review_action' => $validated['review_action'] ?? null,
            'review_comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $metric->type === 'Header'
                ? 'Header dan seluruh node turunannya ditandai sudah dicek auditor.'
                : 'Node standar ditandai sudah dicek auditor.',
            'data' => $metric->fresh(),
        ]);
    }

    public function timeline($id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReadStandards(request(), 'Anda tidak memiliki hak akses untuk melihat riwayat perubahan standar.')) {
            return $denied;
        }

        $metric = MstMetric::findOrFail($id);

        $logs = ActivityLog::with('user:id,name,email')
            ->where('model_type', MstMetric::class)
            ->where('model_id', $metric->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'old_data' => $log->old_data,
                'new_data' => $log->new_data,
                'method' => $log->method,
                'created_at' => $log->created_at,
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }
}
