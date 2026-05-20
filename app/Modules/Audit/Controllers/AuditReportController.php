<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Ptk\Models\TrxPtk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AuditReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('report.view')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melihat laporan audit.',
            ], 403);
        }

        $user = $request->user();
        $hasPtkTable = Schema::hasTable('trx_ptks');

        $auditSchedules = AuditSchedule::query()
            ->with([
                'standard:id,name,periode_tahun',
                'faculty:id,name,code',
                'prodi:id,name,code',
                'leadAuditor:id,name,email',
                'auditor:id,name,email',
                'auditee:id,name,email',
                'creator:id,name,email',
            ])
            ->when(
                ! $user->hasRole('SuperAdmin') && ! $user->hasRole('LPM-Admin'),
                fn ($query) => $query->where(function ($sub) use ($user) {
                    $sub->where('lead_auditor_id', $user->id)
                        ->orWhere('auditor_id', $user->id)
                        ->orWhere('auditee_id', $user->id);

                    if ($user->hasRole('Auditee') && $user->unit_id) {
                        $sub->orWhere('prodi_id', $user->unit_id);
                    }
                })
            )
            ->latest('scheduled_start')
            ->get();

        $schedulesData = $auditSchedules->map(function (AuditSchedule $schedule) use ($hasPtkTable) {
            $ptks = collect();

            if ($hasPtkTable) {
                $ptks = TrxPtk::query()
                    ->where(function ($query) use ($schedule) {
                        $query->where('assigned_unit_id', $schedule->prodi_id)
                            ->orWhere('assigned_user_id', $schedule->auditee_id);
                    })
                    ->with([
                        'standard:id,name,periode_tahun',
                        'metric:id,standard_id,content,type',
                    ])
                    ->get();
            }

            return [
                'id' => $schedule->id,
                'title' => $schedule->title,
                'scheduled_start' => $schedule->scheduled_start?->toISOString(),
                'scheduled_end' => $schedule->scheduled_end?->toISOString(),
                'location' => $schedule->location,
                'notes' => $schedule->notes,
                'auditor_status' => $schedule->auditor_status,
                'auditor_response_note' => $schedule->auditor_response_note,
                'auditor_responded_at' => $schedule->auditor_responded_at?->toISOString(),
                'auditee_status' => $schedule->auditee_status,
                'auditee_response_note' => $schedule->auditee_response_note,
                'auditee_responded_at' => $schedule->auditee_responded_at?->toISOString(),
                'overall_status' => $schedule->overall_status,
                'prodi' => $schedule->prodi ? [
                    'id' => $schedule->prodi->id,
                    'name' => $schedule->prodi->name,
                    'code' => $schedule->prodi->code,
                ] : null,
                'faculty' => $schedule->faculty ? [
                    'id' => $schedule->faculty->id,
                    'name' => $schedule->faculty->name,
                    'code' => $schedule->faculty->code,
                ] : null,
                'standard' => $schedule->standard ? [
                    'id' => $schedule->standard->id,
                    'name' => $schedule->standard->name,
                    'periode_tahun' => $schedule->standard->periode_tahun,
                ] : null,
                'lead_auditor' => $schedule->leadAuditor ? [
                    'id' => $schedule->leadAuditor->id,
                    'name' => $schedule->leadAuditor->name,
                    'email' => $schedule->leadAuditor->email,
                ] : null,
                'auditor' => $schedule->auditor ? [
                    'id' => $schedule->auditor->id,
                    'name' => $schedule->auditor->name,
                    'email' => $schedule->auditor->email,
                ] : null,
                'auditee' => $schedule->auditee ? [
                    'id' => $schedule->auditee->id,
                    'name' => $schedule->auditee->name,
                    'email' => $schedule->auditee->email,
                ] : null,
                'findings_summary' => [
                    'total' => $ptks->count(),
                    'open' => $ptks->whereIn('status', ['OPEN', 'REVISION_REQUIRED'])->count(),
                    'responded' => $ptks->where('status', 'RESPONDED')->count(),
                    'verified' => $ptks->where('status', 'VERIFIED')->count(),
                    'closed' => $ptks->where('status', 'CLOSED')->count(),
                ],
                'findings' => $ptks->map(fn (TrxPtk $ptk) => [
                    'id' => $ptk->id,
                    'status' => $ptk->status,
                    'finding_summary' => $ptk->finding_summary,
                    'metric' => $ptk->metric ? [
                        'id' => $ptk->metric->id,
                        'content' => $ptk->metric->content,
                        'type' => $ptk->metric->type,
                    ] : null,
                    'standard' => $ptk->standard ? [
                        'id' => $ptk->standard->id,
                        'name' => $ptk->standard->name,
                    ] : null,
                    'created_at' => $ptk->created_at?->toISOString(),
                ]),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $schedulesData,
        ]);
    }
}
