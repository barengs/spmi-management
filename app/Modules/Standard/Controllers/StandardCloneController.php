<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MetricTarget;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StandardCloneController extends Controller
{
    /**
     * Copy / Clone keseluruhan MstStandard beserta hirarki MstMetric dan MetricTargets di dalamnya.
     */
    public function clone(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name'          => 'required|string|max:255',
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

            // 1. Gandakan Tabel Induk (MstStandard)
            $newStandard = $sourceStandard->replicate();
            $newStandard->name = $request->name;
            $newStandard->periode_tahun = $request->periode_tahun;
            if ($request->has('category')) {
                $newStandard->category = $request->category;
            }
            $newStandard->status = 'DRAFT'; // Paksa status DRAFT pada standar copy
            $newStandard->is_active = true;
            $newStandard->save();

            // 2. Persiapkan Rekursi untuk Deep Copy Metrics (Struktur Hirarkis)
            // Hanya ambil metrics root (parent_id = null)
            $rootMetrics = MstMetric::where('standard_id', $sourceStandard->id)
                                    ->whereNull('parent_id')
                                    ->orderBy('order', 'asc')
                                    ->get();

            foreach ($rootMetrics as $rootMetric) {
                $this->cloneMetricRecursive($rootMetric, $newStandard->id, null);
            }

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
