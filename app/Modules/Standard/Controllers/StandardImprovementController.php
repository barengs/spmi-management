<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\ActivityLog;
use App\Modules\Ptk\Models\TrxPtk;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\StandardImprovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StandardImprovementController extends Controller
{
    public function __construct(
        private readonly StandardCloneController $standardCloneController,
    ) {
    }

    private function denyUnlessCanManage(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->hasRole('SuperAdmin') || $user->can('standard.update') || $user->can('standard.create'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function transformFinding(TrxPtk $ptk): array
    {
        return [
            'id' => $ptk->id,
            'status' => $ptk->status,
            'finding_summary' => $ptk->finding_summary,
            'target_completion_date' => $ptk->target_completion_date?->toDateString(),
            'standard' => $ptk->standard ? [
                'id' => $ptk->standard->id,
                'name' => $ptk->standard->name,
                'periode_tahun' => $ptk->standard->periode_tahun,
                'version_number' => $ptk->standard->version_number,
            ] : null,
            'metric' => $ptk->metric ? [
                'id' => $ptk->metric->id,
                'content' => $ptk->metric->content,
                'type' => $ptk->metric->type,
            ] : null,
            'assigned_unit' => $ptk->assignedUnit ? [
                'id' => $ptk->assignedUnit->id,
                'name' => $ptk->assignedUnit->name,
                'code' => $ptk->assignedUnit->code,
            ] : null,
            'created_at' => $ptk->created_at?->toISOString(),
        ];
    }

    private function transformImprovement(StandardImprovement $improvement): array
    {
        return [
            'id' => $improvement->id,
            'action' => $improvement->action,
            'justification' => $improvement->justification,
            'cycle_year' => $improvement->cycle_year,
            'decided_at' => $improvement->decided_at?->toISOString(),
            'standard' => $improvement->standard ? [
                'id' => $improvement->standard->id,
                'name' => $improvement->standard->name,
                'periode_tahun' => $improvement->standard->periode_tahun,
                'version_number' => $improvement->standard->version_number,
                'status' => $improvement->standard->status,
            ] : null,
            'new_standard' => $improvement->newStandard ? [
                'id' => $improvement->newStandard->id,
                'name' => $improvement->newStandard->name,
                'periode_tahun' => $improvement->newStandard->periode_tahun,
                'version_number' => $improvement->newStandard->version_number,
                'status' => $improvement->newStandard->status,
            ] : null,
            'finding' => $improvement->finding ? $this->transformFinding($improvement->finding) : null,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request, 'Anda tidak memiliki hak akses untuk melihat peningkatan standar.')) {
            return $denied;
        }

        $standardId = $request->query('standard_id');

        $findings = TrxPtk::query()
            ->with([
                'standard:id,name,periode_tahun,version_number',
                'metric:id,standard_id,content,type',
                'assignedUnit:id,name,code',
            ])
            ->whereIn('status', ['VERIFIED', 'CLOSED'])
            ->when($standardId, fn ($query) => $query->where('standard_id', $standardId))
            ->latest()
            ->get()
            ->map(fn (TrxPtk $ptk) => $this->transformFinding($ptk))
            ->values();

        $improvements = StandardImprovement::query()
            ->with([
                'standard:id,name,periode_tahun,version_number,status',
                'newStandard:id,name,periode_tahun,version_number,status',
                'finding.standard:id,name,periode_tahun,version_number',
                'finding.metric:id,standard_id,content,type',
                'finding.assignedUnit:id,name,code',
            ])
            ->when($standardId, fn ($query) => $query->where('standard_id', $standardId))
            ->latest('decided_at')
            ->get()
            ->map(fn (StandardImprovement $improvement) => $this->transformImprovement($improvement))
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'findings' => $findings,
                'improvements' => $improvements,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request, 'Anda tidak memiliki hak akses untuk memproses peningkatan standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'standard_id' => 'required|exists:mst_standards,id',
            'finding_ptk_id' => 'nullable|exists:trx_ptks,id',
            'action' => 'required|in:REVISI,PERTAHANKAN,HAPUS',
            'justification' => 'required|string',
            'target_period_year' => 'nullable|integer',
        ]);

        $standard = MstStandard::findOrFail($validated['standard_id']);
        $finding = ! empty($validated['finding_ptk_id']) ? TrxPtk::findOrFail($validated['finding_ptk_id']) : null;

        if ($finding && (string) $finding->standard_id !== (string) $standard->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Temuan audit tidak terkait dengan standar yang dipilih.',
            ], 422);
        }

        $existing = StandardImprovement::query()
            ->where('standard_id', $standard->id)
            ->when($finding, fn ($query) => $query->where('finding_ptk_id', $finding->id))
            ->exists();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'Temuan ini sudah pernah diproses dalam workflow peningkatan.',
            ], 422);
        }

        $improvement = null;
        $newStandard = null;

        DB::transaction(function () use ($validated, $standard, $finding, $request, &$improvement, &$newStandard) {
            if ($validated['action'] === 'REVISI') {
                $targetPeriodYear = (int) ($validated['target_period_year'] ?? ((int) ($standard->periode_tahun ?: now()->year) + 1));
                $newVersionNumber = (int) ($standard->version_number ?: 1) + 1;

                $newStandard = $this->standardCloneController->cloneStandardTree($standard, [
                    'name' => sprintf('%s - REVISI V%d', $standard->name, $newVersionNumber),
                    'category' => $standard->category,
                    'periode_tahun' => $targetPeriodYear,
                    'referensi_regulasi' => $standard->referensi_regulasi,
                    'version_number' => $newVersionNumber,
                    'root_standard_id' => $standard->root_standard_id ?: $standard->id,
                    'previous_standard_id' => $standard->id,
                    'improved_from_ptk_id' => $finding?->id,
                    'improvement_justification' => trim($validated['justification']),
                ]);
            }

            if ($validated['action'] === 'HAPUS') {
                $standard->is_active = false;
                $standard->save();
            }

            $improvement = StandardImprovement::create([
                'standard_id' => $standard->id,
                'finding_ptk_id' => $finding?->id,
                'action' => $validated['action'],
                'new_standard_id' => $newStandard?->id,
                'justification' => trim($validated['justification']),
                'cycle_year' => $newStandard?->periode_tahun ?: $standard->periode_tahun,
                'decided_by' => $request->user()?->id,
                'decided_at' => now(),
            ]);

            ActivityLog::record(
                'standard.improvement_recorded',
                StandardImprovement::class,
                $improvement->id,
                null,
                [
                    'standard_id' => $standard->id,
                    'finding_ptk_id' => $finding?->id,
                    'action' => $validated['action'],
                    'new_standard_id' => $newStandard?->id,
                ]
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => $validated['action'] === 'REVISI'
                ? 'Workflow revisi standar berhasil dibuat sebagai versi baru.'
                : ($validated['action'] === 'PERTAHANKAN'
                    ? 'Keputusan mempertahankan standar berhasil disimpan.'
                    : 'Standar berhasil ditandai untuk dihapus dari siklus aktif.'),
            'data' => $this->transformImprovement($improvement->fresh([
                'standard:id,name,periode_tahun,version_number,status',
                'newStandard:id,name,periode_tahun,version_number,status',
                'finding.standard:id,name,periode_tahun,version_number',
                'finding.metric:id,standard_id,content,type',
                'finding.assignedUnit:id,name,code',
            ])),
        ], 201);
    }

    public function summary(Request $request): JsonResponse
    {
        if ($request->user() && ! ($request->user()->can('report.view') || $request->user()->can('standard.view') || $request->user()->hasRole('SuperAdmin'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melihat ringkasan peningkatan.',
            ], 403);
        }

        $items = StandardImprovement::query()
            ->select('cycle_year', 'action')
            ->get()
            ->groupBy('cycle_year')
            ->map(function ($group, $year) {
                return [
                    'cycle_year' => $year ? (int) $year : null,
                    'revisi' => $group->where('action', 'REVISI')->count(),
                    'pertahankan' => $group->where('action', 'PERTAHANKAN')->count(),
                    'hapus' => $group->where('action', 'HAPUS')->count(),
                    'total' => $group->count(),
                ];
            })
            ->sortByDesc('cycle_year')
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }
}
