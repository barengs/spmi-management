<?php

namespace App\Modules\Borang\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Borang\Models\BorangItem;
use App\Modules\Core\Models\ActivityLog;
use App\Modules\Core\Models\AppSetting;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PelaksanaanController extends Controller
{
    private function canAccessProdi(?object $user, Unit $prodi): bool
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

        return AuditSchedule::query()
            ->where('prodi_id', $prodi->id)
            ->where(function ($query) use ($user) {
                $query->where('auditor_id', $user->id)
                    ->orWhere('lead_auditor_id', $user->id)
                    ->orWhere('auditee_id', $user->id);
            })
            ->exists();
    }

    private function canModify(Request $request): bool
    {
        $user = $request->user();

        return (bool) $user && ($user->hasRole('SuperAdmin') || $user->hasRole('Auditee'));
    }

    private function getCycleDurationMonths(): int
    {
        return (int) (AppSetting::valueOf('cycle_duration_months', 4) ?: 4);
    }

    private function buildCycleMeta(?int $periodYear): array
    {
        $durationMonths = $this->getCycleDurationMonths();
        $start = $periodYear ? now()->setDate($periodYear, 1, 1)->startOfDay() : null;
        $end = $start ? $start->copy()->addMonthsNoOverflow($durationMonths)->subDay()->endOfDay() : null;

        return [
            'period_year' => $periodYear,
            'duration_months' => $durationMonths,
            'start_date' => $start?->toDateString(),
            'end_date' => $end?->toDateString(),
            'has_ended' => $end ? now()->greaterThan($end) : false,
        ];
    }

    private function transformEvidence(TrxEvidence $evidence): array
    {
        return [
            'id' => $evidence->id,
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
            'created_at' => $evidence->created_at?->toISOString(),
            'download_url' => $evidence->source_type === 'file' ? "/api/v1/evidences/{$evidence->id}/download" : null,
            'uploader' => $evidence->uploader ? [
                'id' => $evidence->uploader->id,
                'name' => $evidence->uploader->name,
                'email' => $evidence->uploader->email,
            ] : null,
        ];
    }

    private function transformItem(BorangItem $item): array
    {
        $metric = $item->metric;
        $evidences = $item->evidences ?? collect();
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
            'metric_id' => $item->metric_id,
            'standard_id' => $metric?->standard?->id,
            'standard_name' => $metric?->standard?->name ?: '-',
            'period_year' => $metric?->standard?->periode_tahun,
            'sasaran_mutu' => $metric?->parent?->content ?: '-',
            'indikator' => $metric?->content ?: '-',
            'target_sasaran' => $item->target_sasaran ?: '-',
            'pj' => $item->pj ?: 'Kaprodi',
            'implementation_status' => $item->implementation_status,
            'implementation_notes' => $item->implementation_notes,
            'planned_start_date' => $item->planned_start_date?->toDateString(),
            'planned_end_date' => $item->planned_end_date?->toDateString(),
            'actual_start_date' => $item->actual_start_date?->toDateString(),
            'actual_end_date' => $item->actual_end_date?->toDateString(),
            'last_progress_updated_at' => $item->last_progress_updated_at?->toISOString(),
            'assigned_unit' => $item->assignedUnit ? [
                'id' => $item->assignedUnit->id,
                'name' => $item->assignedUnit->name,
                'code' => $item->assignedUnit->code,
                'level' => $item->assignedUnit->level,
            ] : null,
            'assigned_user' => $item->assignedUser ? [
                'id' => $item->assignedUser->id,
                'name' => $item->assignedUser->name,
                'email' => $item->assignedUser->email,
            ] : null,
            'prodi' => $item->prodi ? [
                'id' => $item->prodi->id,
                'name' => $item->prodi->name,
                'code' => $item->prodi->code,
            ] : null,
            'faculty' => $item->prodi?->parent ? [
                'id' => $item->prodi->parent->id,
                'name' => $item->prodi->parent->name,
                'code' => $item->prodi->parent->code,
            ] : null,
            'evidence_summary' => [
                'status' => $evidenceStatus,
                'total' => $evidences->count(),
                'accepted' => $acceptedCount,
                'pending' => $pendingCount,
                'rejected' => $rejectedCount,
            ],
            'cycle' => $this->buildCycleMeta($metric?->standard?->periode_tahun),
        ];
    }

    public function prodis(Request $request): JsonResponse
    {
        $user = $request->user();
        $canViewAll = $user?->can('standard.update');

        if (! $user?->can('standard.update') && ! $user?->can('audit.view') && ! $user?->can('audit.score.update')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses ke pelaksanaan siklus.',
            ], 403);
        }

        $prodis = Unit::query()
            ->with('parent:id,name,code')
            ->where('level', 'department')
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->filter(fn (Unit $prodi) => $canViewAll || $this->canAccessProdi($user, $prodi))
            ->values()
            ->map(function (Unit $prodi) {
                return [
                    'id' => $prodi->id,
                    'name' => $prodi->name,
                    'code' => $prodi->code,
                    'faculty' => $prodi->parent ? [
                        'id' => $prodi->parent->id,
                        'name' => $prodi->parent->name,
                        'code' => $prodi->parent->code,
                    ] : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => [
                'can_modify' => $this->canModify($request),
                'prodis' => $prodis,
            ],
        ]);
    }

    public function index(Request $request, Unit $prodi): JsonResponse
    {
        abort_if($prodi->level !== 'department', 404);

        if (! $this->canAccessProdi($request->user(), $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda hanya dapat melihat pelaksanaan untuk prodi yang ditugaskan kepada Anda.',
            ], 403);
        }

        $items = BorangItem::query()
            ->with([
                'prodi.parent',
                'metric.standard',
                'metric.parent',
                'assignedUnit',
                'assignedUser',
                'evidences.uploader:id,name,email',
            ])
            ->where('prodi_id', $prodi->id)
            ->orderBy('id')
            ->get();

        $rows = $items->map(fn (BorangItem $item) => $this->transformItem($item))->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'can_modify' => $this->canModify($request),
                'rows' => $rows,
            ],
        ]);
    }

    public function show(Request $request, BorangItem $borangItem): JsonResponse
    {
        $borangItem->loadMissing([
            'prodi.parent',
            'metric.standard',
            'metric.parent',
            'assignedUnit',
            'assignedUser',
            'evidences.uploader:id,name,email',
        ]);

        $prodi = $borangItem->prodi;
        abort_if(! $prodi || $prodi->level !== 'department', 404);

        if (! $this->canAccessProdi($request->user(), $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki akses ke item pelaksanaan ini.',
            ], 403);
        }

        $evidenceIds = $borangItem->evidences->pluck('id')->all();
        $logs = ActivityLog::query()
            ->with('user:id,name,email')
            ->where(function ($query) use ($borangItem, $evidenceIds) {
                $query->where(function ($itemQuery) use ($borangItem) {
                    $itemQuery->where('model_type', BorangItem::class)
                        ->where('model_id', $borangItem->id);
                });

                if (! empty($evidenceIds)) {
                    $query->orWhere(function ($evidenceQuery) use ($evidenceIds) {
                        $evidenceQuery->where('model_type', TrxEvidence::class)
                            ->whereIn('model_id', $evidenceIds);
                    });
                }
            })
            ->orderByDesc('created_at')
            ->limit(25)
            ->get()
            ->map(function (ActivityLog $log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'created_at' => $log->created_at?->toISOString(),
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                    'old_data' => $log->old_data,
                    'new_data' => $log->new_data,
                ];
            })
            ->values();

        $assignableUnits = collect([
            $prodi->parent,
            $prodi,
        ])
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'name' => $unit->name,
                'code' => $unit->code,
                'level' => $unit->level,
            ]);

        $assignableUsersQuery = User::query()
            ->where('is_active', true)
            ->orderBy('name');

        if (! $request->user()?->hasRole('SuperAdmin')) {
            $assignableUsersQuery->where(function ($query) use ($prodi, $request) {
                $query->where('unit_id', $prodi->id)
                    ->orWhere('id', $request->user()?->id);
            });
        }

        $assignableUsers = $assignableUsersQuery
            ->get(['id', 'name', 'email', 'unit_id'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'unit_id' => $user->unit_id,
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                ...$this->transformItem($borangItem),
                'can_modify' => $this->canModify($request),
                'evidences' => $borangItem->evidences->map(fn (TrxEvidence $evidence) => $this->transformEvidence($evidence))->values(),
                'activity_logs' => $logs,
                'assignable_units' => $assignableUnits,
                'assignable_users' => $assignableUsers,
            ],
        ]);
    }

    public function update(Request $request, BorangItem $borangItem): JsonResponse
    {
        if (! $this->canModify($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya SuperAdmin dan Auditee yang dapat mengubah pelaksanaan siklus.',
            ], 403);
        }

        $borangItem->loadMissing(['prodi.parent', 'metric.standard', 'metric.parent', 'assignedUnit', 'assignedUser', 'evidences']);
        $prodi = $borangItem->prodi;
        abort_if(! $prodi || $prodi->level !== 'department', 404);

        if (! $this->canAccessProdi($request->user(), $prodi)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki akses ke item pelaksanaan ini.',
            ], 403);
        }

        $validated = $request->validate([
            'implementation_status' => 'required|in:BELUM,SEDANG_BERJALAN,SELESAI',
            'assigned_unit_id' => 'nullable|exists:ref_units,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'planned_start_date' => 'nullable|date',
            'planned_end_date' => 'nullable|date|after_or_equal:planned_start_date',
            'actual_start_date' => 'nullable|date',
            'actual_end_date' => 'nullable|date|after_or_equal:actual_start_date',
            'implementation_notes' => 'nullable|string',
        ]);

        $oldData = $borangItem->only([
            'implementation_status',
            'assigned_unit_id',
            'assigned_user_id',
            'planned_start_date',
            'planned_end_date',
            'actual_start_date',
            'actual_end_date',
            'implementation_notes',
        ]);

        $borangItem->fill([
            'implementation_status' => $validated['implementation_status'],
            'assigned_unit_id' => $validated['assigned_unit_id'] ?? null,
            'assigned_user_id' => $validated['assigned_user_id'] ?? null,
            'planned_start_date' => $validated['planned_start_date'] ?? null,
            'planned_end_date' => $validated['planned_end_date'] ?? null,
            'actual_start_date' => $validated['actual_start_date'] ?? null,
            'actual_end_date' => $validated['actual_end_date'] ?? null,
            'implementation_notes' => $validated['implementation_notes'] ?? null,
            'last_progress_updated_at' => now(),
        ]);
        $borangItem->save();

        $freshItem = $borangItem->fresh([
            'prodi.parent',
            'metric.standard',
            'metric.parent',
            'assignedUnit',
            'assignedUser',
            'evidences.uploader:id,name,email',
        ]);

        ActivityLog::record(
            'pelaksanaan.updated',
            BorangItem::class,
            $borangItem->id,
            $oldData,
            $freshItem?->only([
                'implementation_status',
                'assigned_unit_id',
                'assigned_user_id',
                'planned_start_date',
                'planned_end_date',
                'actual_start_date',
                'actual_end_date',
                'implementation_notes',
            ])
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Data pelaksanaan berhasil diperbarui.',
            'data' => $this->transformItem($freshItem),
        ]);
    }
}
