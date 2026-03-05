<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\TrxAuditSchedule;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuditScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = TrxAuditSchedule::with(['period', 'unit', 'auditors']);
        
        if ($request->has('audit_period_id')) {
            $query->where('audit_period_id', $request->audit_period_id);
        }

        // Kalau login sebagai auditor, filter hanya yang di assigned kepadanya
        $user = auth()->user();
        if ($user && $user->hasRole('Auditor')) {
            $query->whereHas('auditors', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        // Kalau login sebagai auditee, filter hanya unit-nya saja
        if ($user && $user->hasRole('Auditee') && $user->unit_id) {
            $query->where('unit_id', $user->unit_id);
        }

        $schedules = $query->get();
        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'audit_period_id' => 'required|exists:trx_audit_periods,id',
            'unit_id' => 'required|exists:ref_units,id',
            'status' => 'nullable|in:SCHEDULED,IN_PROGRESS,DESK_EVALUATION,FIELD_EVALUATION,COMPLETED',
            'scheduled_date' => 'nullable|date',
            'auditor_ids' => 'required|array',
            'auditor_ids.*' => 'exists:users,id'
        ]);

        // Cek duplicate manual (walau database punya constraint)
        $exists = TrxAuditSchedule::where('audit_period_id', $request->audit_period_id)
            ->where('unit_id', $request->unit_id)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'unit_id' => ['Unit ini sudah diplot pada periode tersebut.']
            ]);
        }

        // Conflict of Interest Validation: Auditor origin unit shouldn't match target unit
        $this->ensureNoConflictOfInterest($request->unit_id, $request->auditor_ids);

        $schedule = TrxAuditSchedule::create($request->only('audit_period_id', 'unit_id', 'status', 'scheduled_date'));
        
        // Sync auditors default is_lead false
        $syncData = [];
        foreach ($request->auditor_ids as $index => $aId) {
            $syncData[$aId] = ['is_lead' => $index === 0]; // auditor pertama jadi lead
        }
        $schedule->auditors()->sync($syncData);

        return response()->json([
            'message' => 'Plotting audit dan penetapan auditor berhasil disimpan.',
            'data' => $schedule->load('auditors', 'unit')
        ], 201);
    }

    public function show($id)
    {
        $schedule = TrxAuditSchedule::with(['period', 'unit', 'auditors'])->findOrFail($id);
        return response()->json(['data' => $schedule]);
    }

    public function update(Request $request, $id)
    {
        $schedule = TrxAuditSchedule::findOrFail($id);

        $request->validate([
            'status' => 'sometimes|in:SCHEDULED,IN_PROGRESS,DESK_EVALUATION,FIELD_EVALUATION,COMPLETED',
            'scheduled_date' => 'sometimes|date',
            'auditor_ids' => 'sometimes|array',
            'auditor_ids.*' => 'exists:users,id'
        ]);

        if ($request->has('auditor_ids')) {
            $this->ensureNoConflictOfInterest($schedule->unit_id, $request->auditor_ids);
            
            $syncData = [];
            foreach ($request->auditor_ids as $index => $aId) {
                // pertahankan lead yang lama jika memungkinkan, atau ganti
                $syncData[$aId] = ['is_lead' => $index === 0];
            }
            $schedule->auditors()->sync($syncData);
        }

        $schedule->update($request->only('status', 'scheduled_date'));

        return response()->json([
            'message' => 'Update jadwal audit & auditor berhasil.',
            'data' => $schedule->load('auditors', 'unit')
        ]);
    }

    public function destroy($id)
    {
        $schedule = TrxAuditSchedule::findOrFail($id);
        $schedule->delete();
        return response()->json(['message' => 'Jadwal audit berhasil dihapus.']);
    }

    /**
     * Validasi Conflict of Interest 
     * Memastikan tidak ada Auditor yang mengaudit Unit asalnya sendiri
     */
    private function ensureNoConflictOfInterest($targetUnitId, array $auditorIds)
    {
        $auditors = User::whereIn('id', $auditorIds)->get();
        foreach ($auditors as $auditor) {
            if ($auditor->unit_id == $targetUnitId) {
                throw ValidationException::withMessages([
                    'auditor_ids' => ['Conflict of Interest: Auditor (' . $auditor->name . ') tidak boleh mengaudit unit kerjanya sendiri.']
                ]);
            }
        }
    }
}
