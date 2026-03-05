<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\TrxAuditPeriod;
use Illuminate\Http\Request;

class AuditPeriodController extends Controller
{
    public function index()
    {
        $periods = TrxAuditPeriod::orderBy('start_date', 'desc')->get();
        return response()->json(['data' => $periods]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|in:PLANNED,ONGOING,COMPLETED'
        ]);

        $period = TrxAuditPeriod::create($request->all());

        return response()->json([
            'message' => 'Periode Audit berhasil dibuat.',
            'data' => $period
        ], 201);
    }

    public function show($id)
    {
        $period = TrxAuditPeriod::findOrFail($id);
        return response()->json(['data' => $period]);
    }

    public function update(Request $request, $id)
    {
        $period = TrxAuditPeriod::findOrFail($id);
        
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'status' => 'sometimes|required|in:PLANNED,ONGOING,COMPLETED'
        ]);

        $period->update($request->all());

        return response()->json([
            'message' => 'Periode Audit berhasil diperbarui.',
            'data' => $period
        ]);
    }
}
