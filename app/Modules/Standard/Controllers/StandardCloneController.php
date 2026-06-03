<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MetricTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StandardCloneController extends Controller
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

    private function normalizeIdentity(string|null $name, string|null $category): string
    {
        return mb_strtolower(trim((string) $name)) . '|' . mb_strtolower(trim((string) $category));
    }

    public function cloneStandardTree(MstStandard $sourceStandard, array $overrides): MstStandard
    {
        $newStandard = $sourceStandard->replicate();
        $newStandard->fill($overrides);
        $newStandard->name = Str::upper(trim((string) ($overrides['name'] ?? $sourceStandard->name)));
        $newStandard->status = 'DRAFT';
        $newStandard->approval_stage = 'DRAFT';
        $newStandard->version_number = $overrides['version_number'] ?? (($sourceStandard->version_number ?? 1));
        $newStandard->root_standard_id = $overrides['root_standard_id'] ?? ($sourceStandard->root_standard_id ?: $sourceStandard->id);
        $newStandard->previous_standard_id = $overrides['previous_standard_id'] ?? null;
        $newStandard->superseded_by_standard_id = null;
        $newStandard->improved_from_ptk_id = $overrides['improved_from_ptk_id'] ?? null;
        $newStandard->improvement_justification = $overrides['improvement_justification'] ?? null;
        $newStandard->submitted_by = null;
        $newStandard->approved_by = null;
        $newStandard->review_submitted_by = null;
        $newStandard->review_submitted_at = null;
        $newStandard->head_lpmi_approved_by = null;
        $newStandard->head_lpmi_approved_at = null;
        $newStandard->wr1_approved_by = null;
        $newStandard->wr1_approved_at = null;
        $newStandard->wr2_approved_by = null;
        $newStandard->wr2_approved_at = null;
        $newStandard->wr3_approved_by = null;
        $newStandard->wr3_approved_at = null;
        $newStandard->rector_approved_by = null;
        $newStandard->rector_approved_at = null;
        $newStandard->reject_reason = null;
        $newStandard->is_active = $overrides['is_active'] ?? true;
        $newStandard->save();

        $rootMetrics = MstMetric::where('standard_id', $sourceStandard->id)
            ->whereNull('parent_id')
            ->orderBy('order', 'asc')
            ->get();

        foreach ($rootMetrics as $rootMetric) {
            $this->cloneMetricRecursive($rootMetric, $newStandard->id, null);
        }

        return $newStandard;
    }

    public function cycleImportCandidates(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.clone', 'Anda tidak memiliki hak akses untuk mengimpor standar dari siklus lama.')) {
            return $denied;
        }

        $validated = $request->validate([
            'target_period' => 'required|integer',
        ]);

        $targetPeriod = (int) $validated['target_period'];

        $currentStandards = MstStandard::query()
            ->where('periode_tahun', $targetPeriod)
            ->get(['name', 'category']);

        $existingIdentities = $currentStandards
            ->map(fn (MstStandard $standard) => $this->normalizeIdentity($standard->name, $standard->category))
            ->all();

        $latestHistoricalStandards = MstStandard::query()
            ->whereNotNull('periode_tahun')
            ->where('periode_tahun', '<', $targetPeriod)
            ->orderByDesc('periode_tahun')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get()
            ->unique(fn (MstStandard $standard) => $this->normalizeIdentity($standard->name, $standard->category))
            ->reject(fn (MstStandard $standard) => in_array(
                $this->normalizeIdentity($standard->name, $standard->category),
                $existingIdentities,
                true
            ))
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $latestHistoricalStandards->map(fn (MstStandard $standard) => [
                'source_standard_id' => $standard->id,
                'name' => $standard->name,
                'category' => $standard->category,
                'source_period' => $standard->periode_tahun,
                'source_status' => $standard->status,
                'referensi_regulasi' => $standard->referensi_regulasi,
            ])->values(),
        ]);
    }

    public function cycleImport(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.clone', 'Anda tidak memiliki hak akses untuk mengimpor standar dari siklus lama.')) {
            return $denied;
        }

        $validated = $request->validate([
            'target_period' => 'required|integer',
            'source_standard_ids' => 'required|array|min:1',
            'source_standard_ids.*' => 'integer|distinct|exists:mst_standards,id',
        ]);

        $targetPeriod = (int) $validated['target_period'];
        $sourceIds = collect($validated['source_standard_ids'])->map(fn ($id) => (int) $id)->values();

        $sourceStandards = MstStandard::query()
            ->whereIn('id', $sourceIds)
            ->get()
            ->keyBy('id');

        foreach ($sourceIds as $sourceId) {
            $sourceStandard = $sourceStandards->get($sourceId);

            if (! $sourceStandard || (int) $sourceStandard->periode_tahun >= $targetPeriod) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Daftar standar yang dipilih tidak valid untuk periode tujuan.',
                ], 422);
            }
        }

        $existingIdentities = MstStandard::query()
            ->where('periode_tahun', $targetPeriod)
            ->get(['name', 'category'])
            ->map(fn (MstStandard $standard) => $this->normalizeIdentity($standard->name, $standard->category));

        $importedStandards = new Collection();

        DB::transaction(function () use ($sourceIds, $sourceStandards, $targetPeriod, &$existingIdentities, &$importedStandards) {
            foreach ($sourceIds as $sourceId) {
                $sourceStandard = $sourceStandards->get($sourceId);
                $identity = $this->normalizeIdentity($sourceStandard->name, $sourceStandard->category);

                if ($existingIdentities->contains($identity)) {
                    continue;
                }

                $importedStandard = $this->cloneStandardTree($sourceStandard, [
                    'periode_tahun' => $targetPeriod,
                    'name' => sprintf('%s - %d', $sourceStandard->name, $targetPeriod),
                    'category' => $sourceStandard->category,
                    'referensi_regulasi' => $sourceStandard->referensi_regulasi,
                ]);

                $existingIdentities->push($identity);
                $importedStandards->push($importedStandard->fresh());
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => $importedStandards->isEmpty()
                ? 'Tidak ada standar baru yang perlu diimpor ke periode ini.'
                : 'Standar dari siklus lama berhasil diimpor ke periode aktif.',
            'data' => $importedStandards->values(),
        ], 201);
    }

    /**
     * Copy / Clone keseluruhan MstStandard beserta hirarki MstMetric dan MetricTargets di dalamnya.
     */
    public function clone(Request $request, $id)
    {
        if ($denied = $this->denyUnless($request, 'standard.clone', 'Anda tidak memiliki hak akses untuk mengkloning standar.')) {
            return $denied;
        }

        $request->merge(['name' => Str::upper(trim((string) $request->input('name')))]);

        $validator = Validator::make($request->all(), [
            'name'          => ['required', 'string', 'max:255', Rule::unique('mst_standards', 'name')],
            'periode_tahun' => 'required|string|max:4',
            'category'      => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors()
            ], 422);
        }

        $sourceStandard = MstStandard::find($id);

        if (!$sourceStandard) {
            return response()->json(['status' => 'error', 'message' => 'Standar Sumber tidak ditemukan'], 404);
        }

        try {
            DB::beginTransaction();

            $newStandard = $this->cloneStandardTree($sourceStandard, [
                'name' => $request->name,
                'periode_tahun' => $request->periode_tahun,
                'category' => $request->has('category') ? $request->category : $sourceStandard->category,
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Berhasil menduplikasi standar',
                'data' => $newStandard
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan sistem saat duplikasi data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a working draft from an implemented standard without changing the
     * currently published version.
     */
    public function revise(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->can('standard.create') || $user->can('standard.update'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk merevisi standar.',
            ], 403);
        }

        $sourceStandard = MstStandard::findOrFail($id);

        if ($sourceStandard->status !== 'TERBIT') {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya standar yang sudah diterbitkan yang dapat dibuatkan draft revisi.',
            ], 422);
        }

        $existingDraft = MstStandard::query()
            ->where('previous_standard_id', $sourceStandard->id)
            ->whereIn('status', ['DRAFT', 'REVISI', 'WAITING_APPROVAL'])
            ->latest('id')
            ->first();

        if ($existingDraft) {
            return response()->json([
                'status' => 'success',
                'message' => 'Draft revisi standar sudah tersedia.',
                'data' => $existingDraft,
            ]);
        }

        $revisedStandard = DB::transaction(fn () => $this->cloneStandardTree($sourceStandard, [
            'name' => sprintf(
                '%s - REVISI V%d',
                $sourceStandard->name,
                (int) ($sourceStandard->version_number ?: 1) + 1
            ),
            'version_number' => (int) ($sourceStandard->version_number ?: 1) + 1,
            'root_standard_id' => $sourceStandard->root_standard_id ?: $sourceStandard->id,
            'previous_standard_id' => $sourceStandard->id,
            'is_active' => false,
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Draft revisi standar berhasil dibuat.',
            'data' => $revisedStandard,
        ], 201);
    }

    /**
     * Helper Rekursif untuk Deep Copy Node dan Children-nya
     */
    private function cloneMetricRecursive(MstMetric $oldMetric, $newStandardId, $newParentId)
    {
        // Copy Metric Node
        $newMetric = $oldMetric->replicate();
        $newMetric->standard_id = $newStandardId;
        $newMetric->parent_id = $newParentId;
        $newMetric->save();

        // Jika ini adalah Indicator, mungkin ada MetricTarget menempel padanya
        if ($oldMetric->type === 'Indicator') {
            $oldTargets = MetricTarget::where('metric_id', $oldMetric->id)->get();
            foreach ($oldTargets as $oldTarget) {
                $newTarget = $oldTarget->replicate();
                $newTarget->metric_id = $newMetric->id;
                $newTarget->save();
            }
        }

        // Cari dan copy Children-nya secara rekursif
        $children = MstMetric::where('parent_id', $oldMetric->id)
                             ->orderBy('order', 'asc')
                             ->get();

        foreach ($children as $child) {
            $this->cloneMetricRecursive($child, $newStandardId, $newMetric->id);
        }
    }
}
