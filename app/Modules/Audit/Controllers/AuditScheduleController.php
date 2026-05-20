<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuditScheduleController extends Controller
{
    private function hasAuditorRole(User $user): bool
    {
        return $user->hasRole('Auditor') || $user->hasRole('Lead Auditor');
    }

    private function canBeLeadAuditor(User $user): bool
    {
        return $user->is_active
            && ! $user->hasRole('Auditee')
            && ! $user->hasRole('LPM-Admin');
    }

    private function validateSchedulePayload(Request $request): array
    {
        return $request->validate(
            [
                'standard_id' => 'nullable|exists:mst_standards,id',
                'faculty_id' => 'nullable|exists:ref_units,id',
                'prodi_id' => 'nullable|exists:ref_units,id',
                'lead_auditor_id' => 'required|exists:users,id|different:auditor_id',
                'auditor_id' => 'required|exists:users,id|different:lead_auditor_id',
                'scheduled_start' => 'required|date',
                'scheduled_end' => 'nullable|date|after_or_equal:scheduled_start',
                'location' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
            ],
            [
                'lead_auditor_id.required' => 'lead auditor wajib dipilih',
                'lead_auditor_id.exists' => 'lead auditor tidak valid',
                'lead_auditor_id.different' => 'lead auditor dan auditor tidak boleh sama',
                'auditor_id.required' => 'auditor wajib dipilih',
                'auditor_id.exists' => 'auditor tidak valid',
                'auditor_id.different' => 'lead auditor dan auditor tidak boleh sama',
                'scheduled_start.required' => 'tanggal mulai audit wajib diisi',
                'scheduled_start.date' => 'tanggal mulai audit tidak valid',
            ]
        );
    }

    private function resolveAuditee(array $validated): User|JsonResponse
    {
        if (empty($validated['prodi_id'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Prodi wajib dipilih agar auditee dapat ditentukan otomatis.',
            ], 422);
        }

        $auditee = User::query()
            ->where('unit_id', $validated['prodi_id'])
            ->where('is_active', true)
            ->role('Auditee')
            ->orderBy('name')
            ->first();

        if (! $auditee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak ada pengguna Auditee aktif pada prodi yang dipilih.',
            ], 422);
        }

        return $auditee;
    }

    private function validateScheduleRelations(array $validated, User $auditee): ?JsonResponse
    {
        $leadAuditor = User::findOrFail($validated['lead_auditor_id']);
        $auditor = User::findOrFail($validated['auditor_id']);
        $faculty = isset($validated['faculty_id']) ? Unit::findOrFail($validated['faculty_id']) : null;
        $prodi = isset($validated['prodi_id']) ? Unit::findOrFail($validated['prodi_id']) : null;

        if (! $this->canBeLeadAuditor($leadAuditor)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lead auditor harus dipilih dari pengguna aktif selain Auditee dan LPM-Admin.',
            ], 422);
        }

        if (! $this->hasAuditorRole($auditor)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengguna auditor harus memiliki role Auditor atau Lead Auditor.',
            ], 422);
        }

        if ((int) $leadAuditor->id === (int) $auditor->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'lead auditor dan auditor tidak boleh sama',
            ], 422);
        }

        if ((int) $leadAuditor->id === (int) $auditee->id || (int) $auditor->id === (int) $auditee->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Auditee tidak boleh sama dengan lead auditor atau auditor.',
            ], 422);
        }

        if (! $auditee->hasRole('Auditee')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengguna auditee harus memiliki role Auditee.',
            ], 422);
        }

        if ($faculty && $faculty->level !== 'faculty') {
            return response()->json([
                'status' => 'error',
                'message' => 'Fakultas yang dipilih tidak valid.',
            ], 422);
        }

        if ($prodi && $prodi->level !== 'department') {
            return response()->json([
                'status' => 'error',
                'message' => 'Prodi yang dipilih tidak valid.',
            ], 422);
        }

        if ($faculty && $prodi && (int) $prodi->parent_id !== (int) $faculty->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Prodi harus berada di bawah fakultas yang dipilih.',
            ], 422);
        }

        if ($prodi) {
            $existingSchedule = AuditSchedule::query()
                ->where('prodi_id', $prodi->id)
                ->when(
                    ! empty($validated['id']),
                    fn ($query) => $query->where('id', '!=', $validated['id'])
                )
                ->exists();

            if ($existingSchedule) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Prodi tersebut sudah memiliki jadwal audit.',
                ], 422);
            }
        }

        $existingAuditorSchedule = AuditSchedule::query()
            ->where('auditor_id', $auditor->id)
            ->when(
                ! empty($validated['id']),
                fn ($query) => $query->where('id', '!=', $validated['id'])
            )
            ->exists();

        if ($existingAuditorSchedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'auditor sudah terdaftar pada jadwal audit lain',
            ], 422);
        }

        return null;
    }

    private function ensureLpmAdmin(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user?->hasRole('SuperAdmin') && ! $user?->hasRole('LPM-Admin')) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function transform(AuditSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'title' => $schedule->title,
            'scheduled_start' => $schedule->scheduled_start?->toISOString(),
            'scheduled_end' => $schedule->scheduled_end?->toISOString(),
            'location' => $schedule->location,
            'notes' => $schedule->notes,
            'overall_status' => $schedule->overall_status,
            'auditor_status' => $schedule->auditor_status,
            'auditor_response_note' => $schedule->auditor_response_note,
            'auditor_responded_at' => $schedule->auditor_responded_at?->toISOString(),
            'auditee_status' => $schedule->auditee_status,
            'auditee_response_note' => $schedule->auditee_response_note,
            'auditee_responded_at' => $schedule->auditee_responded_at?->toISOString(),
            'standard' => $schedule->standard ? [
                'id' => $schedule->standard->id,
                'name' => $schedule->standard->name,
                'periode_tahun' => $schedule->standard->periode_tahun,
            ] : null,
            'faculty' => $schedule->faculty ? [
                'id' => $schedule->faculty->id,
                'name' => $schedule->faculty->name,
                'code' => $schedule->faculty->code,
            ] : null,
            'prodi' => $schedule->prodi ? [
                'id' => $schedule->prodi->id,
                'name' => $schedule->prodi->name,
                'code' => $schedule->prodi->code,
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
            'creator' => $schedule->creator ? [
                'id' => $schedule->creator->id,
                'name' => $schedule->creator->name,
                'email' => $schedule->creator->email,
            ] : null,
            'created_at' => $schedule->created_at?->toISOString(),
        ];
    }

    private function recalculateOverallStatus(AuditSchedule $schedule): void
    {
        if ($schedule->auditor_status === 'REJECTED' || $schedule->auditee_status === 'REJECTED') {
            $schedule->overall_status = 'REJECTED';
        } elseif ($schedule->auditor_status === 'APPROVED' && $schedule->auditee_status === 'APPROVED') {
            $schedule->overall_status = 'APPROVED';
        } else {
            $schedule->overall_status = 'PENDING_APPROVAL';
        }
    }

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('audit.view')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melihat jadwal audit.',
            ], 403);
        }

        $user = $request->user();

        $schedules = AuditSchedule::query()
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
                })
            )
            ->orderBy('scheduled_start')
            ->get()
            ->map(fn (AuditSchedule $schedule) => $this->transform($schedule));

        return response()->json([
            'status' => 'success',
            'data' => $schedules,
        ]);
    }

    public function metadata(Request $request): JsonResponse
    {
        if (! $request->user()?->hasRole('SuperAdmin') && ! $request->user()?->hasRole('LPM-Admin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk menyiapkan jadwal audit.',
            ], 403);
        }

        $faculties = Unit::query()
            ->where('level', 'faculty')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $prodis = Unit::query()
            ->where('level', 'department')
            ->where('is_active', true)
            ->whereHas('users', function ($query) {
                $query->where('is_active', true)->role('Auditee');
            })
            ->whereNotIn('id', AuditSchedule::query()->whereNotNull('prodi_id')->pluck('prodi_id'))
            ->orderBy('name')
            ->get(['id', 'parent_id', 'name', 'code']);

        $leadAuditors = User::query()
            ->where('is_active', true)
            ->whereDoesntHave('roles', function ($query) {
                $query->whereIn('name', ['Auditee', 'LPM-Admin']);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'unit_id']);

        $auditors = User::query()
            ->where(function ($query) {
                $query->role('Auditor');
            })
            ->where('is_active', true)
            ->whereNotIn('id', AuditSchedule::query()->whereNotNull('auditor_id')->pluck('auditor_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'unit_id']);

        $standards = MstStandard::query()
            ->orderByDesc('periode_tahun')
            ->orderBy('name')
            ->get(['id', 'name', 'periode_tahun']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'faculties' => $faculties,
                'prodis' => $prodis,
                'lead_auditors' => $leadAuditors,
                'auditors' => $auditors,
                'standards' => $standards,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $guardError = $this->ensureLpmAdmin($request, 'Hanya LPM-Admin yang dapat membuat jadwal audit.');
        if ($guardError) {
            return $guardError;
        }

        $validated = $this->validateSchedulePayload($request);
        $validated['title'] = $this->generateScheduleTitle($validated);
        $validated['scheduled_end'] = $validated['scheduled_end'] ?? $validated['scheduled_start'];
        $auditee = $this->resolveAuditee($validated);
        if ($auditee instanceof JsonResponse) {
            return $auditee;
        }

        $relationError = $this->validateScheduleRelations($validated, $auditee);
        if ($relationError) {
            return $relationError;
        }

        $schedule = AuditSchedule::create([
            ...$validated,
            'auditee_id' => $auditee->id,
            'created_by' => $request->user()->id,
            'overall_status' => 'PENDING_APPROVAL',
            'auditor_status' => 'PENDING',
            'auditee_status' => 'PENDING',
        ])->load([
            'standard:id,name,periode_tahun',
            'faculty:id,name,code',
            'prodi:id,name,code',
            'leadAuditor:id,name,email',
            'auditor:id,name,email',
            'auditee:id,name,email',
            'creator:id,name,email',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Jadwal audit berhasil dibuat dan menunggu persetujuan auditor serta auditee.',
            'data' => $this->transform($schedule),
        ], 201);
    }

    public function update(Request $request, AuditSchedule $auditSchedule): JsonResponse
    {
        $guardError = $this->ensureLpmAdmin($request, 'Hanya LPM-Admin yang dapat mengubah jadwal audit.');
        if ($guardError) {
            return $guardError;
        }

        $validated = $this->validateSchedulePayload($request);
        $validated['id'] = $auditSchedule->id;
        $validated['title'] = $this->generateScheduleTitle($validated);
        $validated['scheduled_end'] = $validated['scheduled_end'] ?? $validated['scheduled_start'];
        $auditee = $this->resolveAuditee($validated);
        if ($auditee instanceof JsonResponse) {
            return $auditee;
        }

        $relationError = $this->validateScheduleRelations($validated, $auditee);
        if ($relationError) {
            return $relationError;
        }

        $auditSchedule->fill([
            ...$validated,
            'auditee_id' => $auditee->id,
        ]);
        $auditSchedule->save();

        $auditSchedule->load([
            'standard:id,name,periode_tahun',
            'faculty:id,name,code',
            'prodi:id,name,code',
            'leadAuditor:id,name,email',
            'auditor:id,name,email',
            'auditee:id,name,email',
            'creator:id,name,email',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Jadwal audit berhasil diperbarui.',
            'data' => $this->transform($auditSchedule),
        ]);
    }

    private function generateScheduleTitle(array $validated): string
    {
        $faculty = ! empty($validated['faculty_id']) ? Unit::find($validated['faculty_id']) : null;
        $prodi = ! empty($validated['prodi_id']) ? Unit::find($validated['prodi_id']) : null;

        if ($faculty && $prodi) {
            return sprintf('Audit %s - %s', $prodi->name, $faculty->name);
        }

        if ($prodi) {
            return sprintf('Audit %s', $prodi->name);
        }

        if ($faculty) {
            return sprintf('Audit %s', $faculty->name);
        }

        return 'Jadwal Audit';
    }

    public function destroy(Request $request, AuditSchedule $auditSchedule): JsonResponse
    {
        $guardError = $this->ensureLpmAdmin($request, 'Hanya LPM-Admin yang dapat menghapus jadwal audit.');
        if ($guardError) {
            return $guardError;
        }

        $auditSchedule->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Jadwal audit berhasil dihapus.',
            'data' => null,
        ]);
    }

    public function respond(Request $request, AuditSchedule $auditSchedule): JsonResponse
    {
        $user = $request->user();

        $isAuditeeForProdi = $user->hasRole('Auditee')
            && $user->unit_id
            && (int) $auditSchedule->prodi_id === (int) $user->unit_id;

        if (
            (int) $auditSchedule->lead_auditor_id !== (int) $user->id
            && (int) $auditSchedule->auditor_id !== (int) $user->id
            && (int) $auditSchedule->auditee_id !== (int) $user->id
            && ! $isAuditeeForProdi
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak terdaftar sebagai pihak yang dapat merespons jadwal ini.',
            ], 403);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'note' => 'nullable|string',
        ]);

        $status = $validated['action'] === 'approve' ? 'APPROVED' : 'REJECTED';
        $note = $validated['note'] ?? null;

        if ((int) $auditSchedule->lead_auditor_id === (int) $user->id || (int) $auditSchedule->auditor_id === (int) $user->id) {
            $auditSchedule->auditor_status = $status;
            $auditSchedule->auditor_response_note = $note;
            $auditSchedule->auditor_responded_at = now();
        }

        if ((int) $auditSchedule->auditee_id === (int) $user->id || $isAuditeeForProdi) {
            $auditSchedule->auditee_status = $status;
            $auditSchedule->auditee_response_note = $note;
            $auditSchedule->auditee_responded_at = now();
        }

        $this->recalculateOverallStatus($auditSchedule);
        $auditSchedule->save();

        $auditSchedule->load([
            'standard:id,name,periode_tahun',
            'faculty:id,name,code',
            'prodi:id,name,code',
            'auditor:id,name,email',
            'auditee:id,name,email',
            'creator:id,name,email',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $validated['action'] === 'approve'
                ? 'Persetujuan jadwal audit berhasil disimpan.'
                : 'Penolakan jadwal audit berhasil disimpan.',
            'data' => $this->transform($auditSchedule),
        ]);
    }
}
