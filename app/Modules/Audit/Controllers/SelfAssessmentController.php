<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Audit\Models\TrxSelfAssessment;
use App\Modules\Standard\Models\MetricTarget;
use App\Modules\Standard\Models\MstEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Support\Facades\DB;

class SelfAssessmentController extends Controller
{
    public function getTargets(Request $request)
    {
        $user = auth()->user();
        if (!$user || !$user->unit) {
            return response()->json([]);
        }

        // Ambil ID Unit
        $unitId = $user->unit_id;
        
        // Kita juga bisa hanya memfilter metrik target yang jenjangnya sesuai jenjang unit 
        // Namun, jika aplikasi belum sepenuhnya memetakan id level, kita akan mereturn 
        // MetricTarget beserta parent (Metric & Standard) yang aktif.
        // Di MVP ini kita ambil seluruh metric_targets dan meng-eager load relasinya.
        
        $targets = MetricTarget::with([
            'metric',
            'metric.standard',
            'level',
            // Load self assessments hanya untuk unit_id ini
            'selfAssessments' => function($query) use ($unitId) {
                $query->where('unit_id', $unitId)->with('evidences');
            }
        ])->whereHas('metric.standard', function ($q) {
            $q->where('is_active', true);
        })->get();

        // Bisa digroup by standard
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

        return response()->json(array_values($grouped));
    }

    public function save(Request $request)
    {
        $request->validate([
            'metric_target_id' => 'required|exists:metric_targets,id',
            'claimed_score' => 'nullable|numeric|min:0|max:4',
            'success_analysis' => 'nullable|string',
            'failure_analysis' => 'nullable|string',
            'status' => 'nullable|in:DRAFT,SUBMITTED' // bisa digunakan nanti
        ]);

        $user = auth()->user();
        $unitId = $user->unit_id;

        $assessment = TrxSelfAssessment::updateOrCreate(
            ['unit_id' => $unitId, 'metric_target_id' => $request->metric_target_id],
            [
                'claimed_score' => $request->claimed_score,
                'success_analysis' => $request->success_analysis,
                'failure_analysis' => $request->failure_analysis,
                'status' => $request->status ?? 'DRAFT'
            ]
        );

        return response()->json([
            'message' => 'Evaluasi diri berhasil disimpan.',
            'data' => $assessment->load('evidences')
        ]);
    }

    public function linkEvidence(Request $request)
    {
        $request->validate([
            'self_assessment_id' => 'required|exists:trx_self_assessments,id',
            'evidence_id' => 'required|exists:mst_evidences,id',
            'is_rpl' => 'boolean'
        ]);

        $assessment = TrxSelfAssessment::findOrFail($request->self_assessment_id);
        
        // Cek Otorisasi (hanya unit yang bersangkutan yg boleh)
        if ($assessment->unit_id !== auth()->user()->unit_id) {
            return response()->json(['message' => 'Unauthorized action on this assessment.'], 403);
        }

        $assessment->evidences()->syncWithoutDetaching([
            $request->evidence_id => ['is_rpl' => $request->is_rpl ?? false]
        ]);

        return response()->json(['message' => 'Bukti prodi (termasuk RPL) berhasil ditautkan.']);
    }

    public function unlinkEvidence(Request $request)
    {
        $request->validate([
            'self_assessment_id' => 'required|exists:trx_self_assessments,id',
            'evidence_id' => 'required|exists:mst_evidences,id'
        ]);

        $assessment = TrxSelfAssessment::findOrFail($request->self_assessment_id);
        
        if ($assessment->unit_id !== auth()->user()->unit_id) {
            return response()->json(['message' => 'Unauthorized action on this assessment.'], 403);
        }

        $assessment->evidences()->detach($request->evidence_id);

        return response()->json(['message' => 'Tautan bukti prodi berhasil dilepas.']);
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
