<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Audit\Services\AuditReportExportService;
use App\Modules\Ptk\Models\TrxPtk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Settings;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AuditReportController extends Controller
{
    public function __construct(
        private readonly AuditReportExportService $exportService,
    ) {}

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

        $auditSchedules = $this->baseQuery($request)
            ->latest('scheduled_start')
            ->get();

        $schedulesData = $auditSchedules->map(function (AuditSchedule $schedule) use ($hasPtkTable) {
            return $this->transformScheduleToReportPayload($schedule, $hasPtkTable);
        });

        return response()->json([
            'status' => 'success',
            'data' => $schedulesData,
        ]);
    }

    public function export(Request $request, AuditSchedule $auditSchedule): BinaryFileResponse|JsonResponse
    {
        if (! $request->user()?->can('report.view')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengekspor laporan audit.',
            ], 403);
        }

        $hasPtkTable = Schema::hasTable('trx_ptks');

        $schedule = $this->baseQuery($request)
            ->whereKey($auditSchedule->id)
            ->first();

        if (! $schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Laporan audit tidak ditemukan.',
            ], 404);
        }

        $findings = $hasPtkTable
            ? $this->queryFindingsForSchedule($schedule)->get()
            : collect();

        $htmlDocument = $this->exportService->buildWordHtml($schedule, $findings);
        $format = strtolower((string) $request->query('format', 'docx'));

        if (! in_array($format, ['doc', 'docx', 'pdf'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format export tidak didukung.',
            ], 422);
        }

        if ($format === 'doc') {
            $filename = 'laporan-ami-' . $schedule->id . '.doc';
            return response()->streamDownload(function () use ($htmlDocument) {
                echo $htmlDocument;
            }, $filename, [
                'Content-Type' => 'application/msword; charset=UTF-8',
            ]);
        }

        $phpWord = $this->exportService->buildPhpWord($schedule, $findings);

        if ($format === 'pdf') {
            Settings::setPdfRendererName(Settings::PDF_RENDERER_DOMPDF);
            Settings::setPdfRendererPath(base_path('vendor/dompdf/dompdf'));

            $filename = 'laporan-ami-' . $schedule->id . '.pdf';
            $tempPath = storage_path('app/tmp-' . uniqid('laporan-ami-', true) . '.pdf');
            $writer = IOFactory::createWriter($phpWord, 'PDF');
            $writer->save($tempPath);

            return response()->download(
                $tempPath,
                $filename,
                ['Content-Type' => 'application/pdf']
            )->deleteFileAfterSend(true);
        }

        $filename = 'laporan-ami-' . $schedule->id . '.docx';
        $tempPath = storage_path('app/tmp-' . uniqid('laporan-ami-', true) . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download(
            $tempPath,
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        )->deleteFileAfterSend(true);
    }

    private function baseQuery(Request $request)
    {
        $user = $request->user();

        return AuditSchedule::query()
            ->with([
                'standard:id,name,periode_tahun',
                'faculty:id,name,code',
                'prodi:id,name,code',
                'leadAuditor:id,name,email',
                'auditor:id,name,email',
                'auditee:id,name,email',
                'creator:id,name,email',
                'periodCloser:id,name,email',
            ])
            ->where('audit_period_status', 'ENDED')
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
            );
    }

    private function queryFindingsForSchedule(AuditSchedule $schedule)
    {
        return TrxPtk::query()
            ->where(function ($query) use ($schedule) {
                $query->where('assigned_unit_id', $schedule->prodi_id)
                    ->orWhere('assigned_user_id', $schedule->auditee_id);
            })
            ->with([
                'standard:id,name,periode_tahun',
                'metric:id,standard_id,content,type',
            ]);
    }

    private function transformScheduleToReportPayload(AuditSchedule $schedule, bool $hasPtkTable): array
    {
        $ptks = $hasPtkTable
            ? $this->queryFindingsForSchedule($schedule)->get()
            : collect();

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
            'audit_period_status' => $schedule->audit_period_status,
            'audit_period_conclusion' => $schedule->audit_period_conclusion,
            'audit_period_closed_at' => $schedule->audit_period_closed_at?->toISOString(),
            'prodi' => $schedule->prodi ? [
                'id' => $schedule->prodi->id,
                'name' => $schedule->prodi->name,
                'code' => $schedule->prodi->code,
                'level' => $schedule->prodi->level,
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
            'period_closer' => $schedule->periodCloser ? [
                'id' => $schedule->periodCloser->id,
                'name' => $schedule->periodCloser->name,
                'email' => $schedule->periodCloser->email,
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
    }
}
