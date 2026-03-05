<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Audit\Models\TrxAuditSchedule;
use App\Modules\Audit\Models\TrxAuditWorkingPaper;
use App\Modules\Standard\Models\MetricTarget;

class WorkingPaperController extends Controller
{
    /**
     * Dapatkan data Kertas Kerja Audit (Split Screen) untuk auditor
     */
    public function getPaper(Request $request, $scheduleId)
    {
        $schedule = TrxAuditSchedule::with('period')->findOrFail($scheduleId);
        $unitId = $schedule->unit_id;

        // Otorisasi: Pastikan user login adalah auditor untuk schedule ini, 
        // atau role SuperAdmin/LPM-Admin.
        $user = auth()->user();
        $isAuditor = $schedule->auditors()->where('user_id', $user->id)->exists();
        $isAdmin = $user->hasRole(['SuperAdmin', 'LPM-Admin']);
        
        if (!$isAuditor && !$isAdmin) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke kertas kerja audit ini.'], 403);
        }

        // Ambil semua target capaian yang relevan.
        $targets = MetricTarget::with([
            'metric',
            'metric.standard',
            'level',
            // Load Self-Assessment dari Prodi (unit_id) yang sedang diaudit
            'selfAssessments' => function($query) use ($unitId) {
                $query->where('unit_id', $unitId)->with('evidences');
            },
            // Load isian kertas kerja Auditor saat ini
            'workingPapers' => function($query) use ($scheduleId) {
                $query->where('audit_schedule_id', $scheduleId)->with('finding');
            }
        ])->whereHas('metric.standard', function ($q) {
            $q->where('is_active', true);
        })->get();

        // Kelompokkan berdasar Standar Mutu agar UI mudah me-render pohon navigasi (Sidebar kiri/atas)
        $grouped = [];
        foreach ($targets as $t) {
            if (!$t->metric || !$t->metric->standard) continue;
            
            $stdId = $t->metric->standard->id;
            if (!isset($grouped[$stdId])) {
                $grouped[$stdId] = [
                    'standard' => $t->metric->standard,
                    'targets' => []
                ];
            }
            $grouped[$stdId]['targets'][] = $t;
        }

        return response()->json([
            'schedule' => $schedule->load('unit', 'auditors'),
            'data' => array_values($grouped)
        ]);
    }

    /**
     * Simpan (Auto-Save) isian Kertas Kerja Audit dari Auditor
     */
    public function savePaper(Request $request, $scheduleId)
    {
        $request->validate([
            'metric_target_id' => 'required|exists:metric_targets,id',
            'auditor_score'    => 'nullable|numeric|min:0|max:9999',
            'status'           => 'nullable|in:SESUAI,OB,KTS_MINOR,KTS_MAYOR,MELAMPAUI',
            'auditor_notes'    => 'nullable|string',
            'finding_uraian'   => 'nullable|string',
            'finding_akar'     => 'nullable|string',
            'finding_rekomendasi' => 'nullable|string'
        ]);

        $schedule = TrxAuditSchedule::findOrFail($scheduleId);

        // Otorisasi auditor
        $user = auth()->user();
        $isAuditor = $schedule->auditors()->where('user_id', $user->id)->exists();
        if (!$isAuditor && !$user->hasRole('SuperAdmin')) {
            return response()->json(['message' => 'Hanya auditor terploting yang berhak mengisi kertas kerja ini.'], 403);
        }

        // Tentukan nilai cap yang sudah tersimpan
        $paper = TrxAuditWorkingPaper::updateOrCreate(
            [
                'audit_schedule_id' => $schedule->id,
                'metric_target_id'  => $request->metric_target_id
            ],
            [
                'auditor_score' => $request->auditor_score,
                'status'        => $request->status,
                'auditor_notes' => $request->auditor_notes
            ]
        );

        // Jika status adalah KTS atau OB, simpan Temuan
        if (in_array($request->status, ['OB', 'KTS_MINOR', 'KTS_MAYOR'])) {
            $paper->finding()->updateOrCreate(
                ['audit_working_paper_id' => $paper->id],
                [
                    'uraian_temuan' => $request->finding_uraian ?? '',
                    'akar_masalah'  => $request->finding_akar ?? '',
                    'rekomendasi'   => $request->finding_rekomendasi ?? ''
                ]
            );
        } else {
            // Hapus finding jika status kembali ke Sesuai/Melampaui
            if ($paper->finding) {
                $paper->finding()->delete();
            }
        }

        return response()->json([
            'message' => 'Kertas kerja berhasil diamankan system (Auto-Save).',
            'data'    => $paper->load('finding')
        ]);
    }
}
