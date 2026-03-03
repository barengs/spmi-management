<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MetricTarget;

class MetricTargetController extends Controller
{
    /**
     * Get all targets for a specific metric
     */
    public function getTargets($metric_id)
    {
        $metric = MstMetric::findOrFail($metric_id);
        
        $targets = MetricTarget::with('level')->where('metric_id', $metric_id)->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $targets
        ]);
    }

    /**
     * Batch Sync multiple level targets for a metric
     */
    public function syncTargets(Request $request, $metric_id)
    {
        // $request->targets should be an array of target objects
        /* 
           target object: 
           { 
             level_id: "uuid", 
             target_value: "80", 
             measure_unit: "Persen", 
             data_source: "Manual", 
             evidence_type: "File PDF" 
           }
        */
        $validator = Validator::make($request->all(), [
            'targets' => 'required|array',
            'targets.*.level_id' => 'required|exists:ref_education_levels,id',
            'targets.*.target_value' => 'nullable|string',
            'targets.*.measure_unit' => 'required|string',
            'targets.*.data_source' => 'required|string',
            'targets.*.evidence_type' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $metric = MstMetric::findOrFail($metric_id);
        if (in_array($metric->standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengubah target metrik dari Standar Mutu yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $inputTargets = collect($request->targets);

        // Delete any targets that are NOT in the incoming request payload
        // So the frontend controls the active rows
        $incomingLevelIds = $inputTargets->pluck('level_id')->toArray();
        MetricTarget::where('metric_id', $metric_id)
            ->whereNotIn('level_id', $incomingLevelIds)
            ->forceDelete();

        // Update or Create
        $updatedTargets = [];
        foreach ($inputTargets as $row) {
            $updatedTargets[] = MetricTarget::updateOrCreate(
                [
                    'metric_id' => $metric_id,
                    'level_id' => $row['level_id'],
                ],
                [
                    'target_value' => $row['target_value'] ?? null,
                    'measure_unit' => $row['measure_unit'],
                    'data_source' => $row['data_source'],
                    'evidence_type' => $row['evidence_type'],
                ]
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Target berhasil diperbarui/disinkronisasi',
            'data' => $updatedTargets
        ]);
    }
}
