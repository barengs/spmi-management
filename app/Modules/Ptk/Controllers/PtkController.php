<?php

namespace App\Modules\Ptk\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Ptk\Models\TrxPtk;
use App\Modules\Standard\Models\MstMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PtkController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->can('ptk.create')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk membuat tindak koreksi.',
            ], 403);
        }

        $validated = $request->validate([
            'metric_id' => 'required|exists:mst_metrics,id',
            'evidence_id' => 'nullable|exists:trx_evidences,id',
            'finding_summary' => 'required|string',
            'assigned_unit_id' => 'nullable|exists:ref_units,id',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        $metric = MstMetric::with('standard')->findOrFail($validated['metric_id']);
        $evidence = null;

        if (! empty($validated['evidence_id'])) {
            $evidence = TrxEvidence::with('uploader:id,name,email,unit_id')->findOrFail($validated['evidence_id']);

            if ((string) $evidence->metric_id !== (string) $metric->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bukti yang dipilih tidak sesuai dengan indikator PTK.',
                ], 422);
            }
        }

        $assignedUnitId = $validated['assigned_unit_id'] ?? $evidence?->uploader?->unit_id;
        $assignedUserId = $validated['assigned_user_id'] ?? $evidence?->uploaded_by;

        if (! $assignedUnitId && ! $assignedUserId) {
            return response()->json([
                'status' => 'error',
                'message' => 'PTK harus ditugaskan minimal ke satu unit atau satu pengguna.',
            ], 422);
        }

        if ($assignedUnitId) {
            Unit::findOrFail($assignedUnitId);
        }

        if ($assignedUserId) {
            $assignedUser = User::findOrFail($assignedUserId);

            if ($assignedUnitId && (string) $assignedUser->unit_id !== (string) $assignedUnitId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Pengguna yang ditugaskan tidak berada pada unit yang dipilih.',
                ], 422);
            }
        }

        $ptk = TrxPtk::create([
            'evidence_id' => $validated['evidence_id'] ?? null,
            'metric_id' => $metric->id,
            'standard_id' => $metric->standard_id,
            'assigned_user_id' => $assignedUserId,
            'assigned_unit_id' => $assignedUnitId,
            'created_by' => $user->id,
            'status' => 'OPEN',
            'finding_summary' => trim($validated['finding_summary']),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PTK berhasil dibuat.',
            'data' => $this->transformPtk($ptk->fresh($this->relations())),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('ptk.view')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk melihat tindak koreksi.',
            ], 403);
        }

        $user = $request->user();
        $query = TrxPtk::query()
            ->with([
                'standard:id,name,category,periode_tahun',
                'metric:id,standard_id,content,type',
                'assignedUser:id,name,email,unit_id',
                'assignedUnit:id,parent_id,name,code,level',
                'creator:id,name,email',
                'responder:id,name,email',
                'verifier:id,name,email',
                'closer:id,name,email',
                'evidence:id,metric_id,uploaded_by,source_type,title,notes,link_url,original_name,stored_name,mime_type,size_bytes,review_status,review_comment,reviewed_by,reviewed_at',
                'evidence.uploader:id,name,email,unit_id',
                'evidence.uploader.unit:id,parent_id,name,code,level',
                'evidence.reviewer:id,name,email',
            ])
            ->latest();

        if (! $user->hasRole('SuperAdmin') && ! $user->can('ptk.verify') && ! $user->can('ptk.close')) {
            $query->where(function ($builder) use ($user) {
                $builder
                    ->where('assigned_user_id', $user->id)
                    ->orWhere('responded_by', $user->id);

                if ($user->unit_id) {
                    $builder->orWhere('assigned_unit_id', $user->unit_id);
                }
            });
        }

        $status = $request->query('status');
        if ($status) {
            $query->where('status', $status);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get()->map(fn (TrxPtk $ptk) => $this->transformPtk($ptk)),
        ]);
    }

    public function respond(Request $request, TrxPtk $ptk): JsonResponse
    {
        $user = $request->user();

        if (! $user?->can('ptk.respond')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk merespons tindak koreksi.',
            ], 403);
        }

        if (! $this->canRespond($user, $ptk)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tindak koreksi ini tidak ditugaskan ke akun atau unit Anda.',
            ], 403);
        }

        if (! in_array($ptk->status, ['OPEN', 'REVISION_REQUIRED'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tindak koreksi ini tidak dapat direspons pada status saat ini.',
            ], 422);
        }

        $validated = $request->validate([
            'response_note' => 'required|string',
        ]);

        $ptk->forceFill([
            'status' => 'RESPONDED',
            'response_note' => $validated['response_note'],
            'responded_at' => now(),
            'responded_by' => $user->id,
            'verification_note' => null,
            'verified_at' => null,
            'verified_by' => null,
            'closure_note' => null,
            'closed_at' => null,
            'closed_by' => null,
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Tindak lanjut PTK berhasil dikirim.',
            'data' => $this->transformPtk($ptk->fresh($this->relations())),
        ]);
    }

    public function verify(Request $request, TrxPtk $ptk): JsonResponse
    {
        $user = $request->user();

        if (! $user?->can('ptk.verify')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk memverifikasi tindak koreksi.',
            ], 403);
        }

        if ($ptk->status !== 'RESPONDED') {
            return response()->json([
                'status' => 'error',
                'message' => 'PTK hanya dapat diverifikasi setelah ada tindak lanjut dari auditee.',
            ], 422);
        }

        $validated = $request->validate([
            'action' => ['required', Rule::in(['accept', 'reject'])],
            'verification_note' => 'required|string',
        ]);

        $ptk->forceFill([
            'status' => $validated['action'] === 'accept' ? 'VERIFIED' : 'REVISION_REQUIRED',
            'verification_note' => $validated['verification_note'],
            'verified_at' => now(),
            'verified_by' => $user->id,
            'closed_at' => null,
            'closed_by' => null,
            'closure_note' => null,
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => $validated['action'] === 'accept'
                ? 'Tindak koreksi telah diverifikasi auditor.'
                : 'Tindak koreksi dikembalikan untuk perbaikan lanjutan.',
            'data' => $this->transformPtk($ptk->fresh($this->relations())),
        ]);
    }

    public function close(Request $request, TrxPtk $ptk): JsonResponse
    {
        $user = $request->user();

        if (! $user?->can('ptk.close')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk menutup tindak koreksi.',
            ], 403);
        }

        if ($ptk->status !== 'VERIFIED') {
            return response()->json([
                'status' => 'error',
                'message' => 'PTK hanya dapat ditutup setelah diverifikasi.',
            ], 422);
        }

        $validated = $request->validate([
            'closure_note' => 'required|string',
        ]);

        $ptk->forceFill([
            'status' => 'CLOSED',
            'closure_note' => $validated['closure_note'],
            'closed_at' => now(),
            'closed_by' => $user->id,
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'PTK berhasil ditutup.',
            'data' => $this->transformPtk($ptk->fresh($this->relations())),
        ]);
    }

    private function canRespond(User $user, TrxPtk $ptk): bool
    {
        return $user->hasRole('SuperAdmin')
            || (string) $ptk->assigned_user_id === (string) $user->id
            || (
                $user->unit_id !== null
                && $ptk->assigned_unit_id !== null
                && (string) $ptk->assigned_unit_id === (string) $user->unit_id
            );
    }

    private function relations(): array
    {
        return [
            'standard:id,name,category,periode_tahun',
            'metric:id,standard_id,content,type',
            'assignedUser:id,name,email,unit_id',
            'assignedUnit:id,parent_id,name,code,level',
            'creator:id,name,email',
            'responder:id,name,email',
            'verifier:id,name,email',
            'closer:id,name,email',
            'evidence:id,metric_id,uploaded_by,source_type,title,notes,link_url,original_name,stored_name,mime_type,size_bytes,review_status,review_comment,reviewed_by,reviewed_at',
            'evidence.uploader:id,name,email,unit_id',
            'evidence.uploader.unit:id,parent_id,name,code,level',
            'evidence.reviewer:id,name,email',
        ];
    }

    private function transformPtk(TrxPtk $ptk): array
    {
        return [
            'id' => $ptk->id,
            'status' => $ptk->status,
            'finding_summary' => $ptk->finding_summary,
            'response_note' => $ptk->response_note,
            'responded_at' => $ptk->responded_at?->toISOString(),
            'verification_note' => $ptk->verification_note,
            'verified_at' => $ptk->verified_at?->toISOString(),
            'closure_note' => $ptk->closure_note,
            'closed_at' => $ptk->closed_at?->toISOString(),
            'created_at' => $ptk->created_at?->toISOString(),
            'updated_at' => $ptk->updated_at?->toISOString(),
            'standard' => $ptk->standard ? [
                'id' => $ptk->standard->id,
                'name' => $ptk->standard->name,
                'category' => $ptk->standard->category,
                'periode_tahun' => $ptk->standard->periode_tahun,
            ] : null,
            'metric' => $ptk->metric ? [
                'id' => $ptk->metric->id,
                'content' => $ptk->metric->content,
                'type' => $ptk->metric->type,
            ] : null,
            'assigned_user' => $ptk->assignedUser ? [
                'id' => $ptk->assignedUser->id,
                'name' => $ptk->assignedUser->name,
                'email' => $ptk->assignedUser->email,
            ] : null,
            'assigned_unit' => $ptk->assignedUnit ? [
                'id' => $ptk->assignedUnit->id,
                'name' => $ptk->assignedUnit->name,
                'code' => $ptk->assignedUnit->code,
                'level' => $ptk->assignedUnit->level,
            ] : null,
            'creator' => $ptk->creator ? [
                'id' => $ptk->creator->id,
                'name' => $ptk->creator->name,
            ] : null,
            'responder' => $ptk->responder ? [
                'id' => $ptk->responder->id,
                'name' => $ptk->responder->name,
            ] : null,
            'verifier' => $ptk->verifier ? [
                'id' => $ptk->verifier->id,
                'name' => $ptk->verifier->name,
            ] : null,
            'closer' => $ptk->closer ? [
                'id' => $ptk->closer->id,
                'name' => $ptk->closer->name,
            ] : null,
            'evidence' => $ptk->evidence ? [
                'id' => $ptk->evidence->id,
                'title' => $ptk->evidence->title,
                'notes' => $ptk->evidence->notes,
                'source_type' => $ptk->evidence->source_type,
                'link_url' => $ptk->evidence->link_url,
                'review_status' => $ptk->evidence->review_status,
                'review_comment' => $ptk->evidence->review_comment,
                'reviewed_at' => $ptk->evidence->reviewed_at?->toISOString(),
                'uploader' => $ptk->evidence->uploader ? [
                    'id' => $ptk->evidence->uploader->id,
                    'name' => $ptk->evidence->uploader->name,
                    'email' => $ptk->evidence->uploader->email,
                    'unit' => $ptk->evidence->uploader->relationLoaded('unit') && $ptk->evidence->uploader->unit ? [
                        'id' => $ptk->evidence->uploader->unit->id,
                        'name' => $ptk->evidence->uploader->unit->name,
                        'code' => $ptk->evidence->uploader->unit->code,
                        'level' => $ptk->evidence->uploader->unit->level,
                    ] : null,
                ] : null,
                'reviewer' => $ptk->evidence->reviewer ? [
                    'id' => $ptk->evidence->reviewer->id,
                    'name' => $ptk->evidence->reviewer->name,
                ] : null,
            ] : null,
        ];
    }
}
