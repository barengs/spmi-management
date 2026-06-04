<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Borang\Models\BorangItem;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\StandardImprovement;
use App\Modules\Standard\Services\StandardDocumentImportService;
use App\Modules\Standard\Services\StandardExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StandardController extends Controller
{
    private const CATEGORY_WR_ROLE_MAP = [
        'Pendidikan' => 'Wakil Rektor 3',
        'Penelitian' => 'Wakil Rektor 2',
        'Pengabdian' => 'Wakil Rektor 1',
        'Tambahan' => 'Wakil Rektor 1',
    ];

    public function __construct(
        private readonly StandardDocumentImportService $documentImportService,
        private readonly StandardExportService $standardExportService,
    ) {
    }

    private function allowedCategories(): string
    {
        return implode(',', array_keys(self::CATEGORY_WR_ROLE_MAP));
    }

    private function getRequiredWrRole(MstStandard $standard): string
    {
        return self::CATEGORY_WR_ROLE_MAP[$standard->category] ?? 'Wakil Rektor 1';
    }

    private function markWrApproval(MstStandard $standard, int|string $userId): void
    {
        $role = $this->getRequiredWrRole($standard);

        if ($role === 'Wakil Rektor 3') {
            $standard->wr3_approved_by = $userId;
            $standard->wr3_approved_at = now();
            return;
        }

        if ($role === 'Wakil Rektor 2') {
            $standard->wr2_approved_by = $userId;
            $standard->wr2_approved_at = now();
            return;
        }

        $standard->wr1_approved_by = $userId;
        $standard->wr1_approved_at = now();
    }

    private function denyUnless(Request $request, string $permission, string $message): ?JsonResponse
    {
        if (! $request->user()?->can($permission)) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function canReadStandards(Request $request): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->hasRole('SuperAdmin')) {
            return true;
        }

        return collect([
            'standard.view',
            'standard.create',
            'standard.update',
            'standard.delete',
            'standard.publish',
            'report.export',
        ])->contains(fn (string $permission) => $user->can($permission));
    }

    private function denyUnlessCanReadStandards(Request $request, string $message): ?JsonResponse
    {
        if (! $this->canReadStandards($request)) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function denyUnlessCanDraft(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->can('standard.create') || $user->can('standard.update'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function canDraftStandards(Request $request): bool
    {
        $user = $request->user();

        return (bool) ($user && ($user->can('standard.create') || $user->can('standard.update')));
    }

    private function denyUnlessCanAudit(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! ($user->hasRole('SuperAdmin') || $user->can('standard.publish'))) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function denyUnlessCanReview(Request $request, string $message): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! (
            $user->hasRole('SuperAdmin')
            || $user->hasRole('Pimpinan')
            || $user->hasRole('Kepala LPMI')
            || $user->hasRole('Wakil Rektor 1')
            || $user->hasRole('Wakil Rektor 2')
            || $user->hasRole('Wakil Rektor 3')
            || $user->hasRole('Rektor')
        )) {
            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 403);
        }

        return null;
    }

    private function resetApprovalFlow(MstStandard $standard): void
    {
        $standard->approval_stage = 'DRAFT';
        $standard->head_lpmi_approved_by = null;
        $standard->head_lpmi_approved_at = null;
        $standard->wr1_approved_by = null;
        $standard->wr1_approved_at = null;
        $standard->wr2_approved_by = null;
        $standard->wr2_approved_at = null;
        $standard->wr3_approved_by = null;
        $standard->wr3_approved_at = null;
        $standard->rector_approved_by = null;
        $standard->rector_approved_at = null;
    }

    private function currentApprovalLabel(MstStandard $standard): string
    {
        return match ($standard->approval_stage) {
            'HEAD_LPMI' => 'Kepala LPMI',
            'WR' => $this->getRequiredWrRole($standard),
            'RECTOR' => 'Rektor',
            default => 'Tahap awal',
        };
    }

    private function activateRevisedStandard(MstStandard $standard): void
    {
        if (! $standard->previous_standard_id) {
            return;
        }

        $previousStandard = MstStandard::find($standard->previous_standard_id);

        if (! $previousStandard) {
            return;
        }

        $previousStandard->is_active = false;
        $previousStandard->superseded_by_standard_id = $standard->id;
        $previousStandard->save();

        $standard->is_active = true;

        StandardImprovement::query()
            ->where('new_standard_id', $standard->id)
            ->update([
                'cycle_year' => $standard->periode_tahun,
            ]);
    }

    private function approveAsCurrentActor(Request $request, MstStandard $standard): ?JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('SuperAdmin')) {
            if ($standard->approval_stage === 'HEAD_LPMI') {
                $standard->head_lpmi_approved_by = $user->id;
                $standard->head_lpmi_approved_at = now();
                $standard->approval_stage = 'WR';
                return null;
            }

            if ($standard->approval_stage === 'WR') {
                $this->markWrApproval($standard, $user->id);
                $standard->approval_stage = 'RECTOR';
                return null;
            }

            if ($standard->approval_stage === 'RECTOR') {
                $standard->rector_approved_by = $user->id;
                $standard->rector_approved_at = now();
                return null;
            }
        }

        if ($standard->approval_stage === 'HEAD_LPMI') {
            if (! $user->hasRole('Kepala LPMI')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Standar saat ini menunggu persetujuan Kepala LPMI.',
                ], 403);
            }

            $standard->head_lpmi_approved_by = $user->id;
            $standard->head_lpmi_approved_at = now();
            $standard->approval_stage = 'WR';
            return null;
        }

        if ($standard->approval_stage === 'WR') {
            $requiredRole = $this->getRequiredWrRole($standard);

            if (! $user->hasRole($requiredRole)) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Standar saat ini menunggu persetujuan {$requiredRole}.",
                ], 403);
            }

            $this->markWrApproval($standard, $user->id);
            $standard->approval_stage = 'RECTOR';

            return null;
        }

        if ($standard->approval_stage === 'RECTOR') {
            if (! $user->hasRole('Rektor')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Standar saat ini menunggu persetujuan Rektor.',
                ], 403);
            }

            $standard->rector_approved_by = $user->id;
            $standard->rector_approved_at = now();
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Tahap persetujuan standar tidak valid.',
        ], 422);
    }

    private function structureValidationError(MstStandard $standard): ?JsonResponse
    {
        $invalidStatements = $standard->structuralNodesWithoutContent();

        if ($invalidStatements->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Masih ada Poin Utama atau Sub Poin yang belum memiliki isi.',
            'errors' => [
                'nodes' => $invalidStatements->map(fn ($statement) => [
                    'id' => $statement->id,
                    'content' => $statement->content,
                    'type' => $statement->type,
                ])->values(),
            ],
        ], 422);
    }

    private function reviewValidationError(MstStandard $standard): ?JsonResponse
    {
        $rejectedMetrics = MstMetric::where('standard_id', $standard->id)
            ->where('review_status', 'REJECTED')
            ->orderBy('id')
            ->get(['id', 'type', 'content', 'review_action', 'review_comment']);

        if ($rejectedMetrics->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Standar tidak dapat diterbitkan karena masih ada header atau node yang ditolak reviewer.',
            'errors' => [
                'metrics' => $rejectedMetrics->map(fn (MstMetric $metric) => [
                    'id' => $metric->id,
                    'type' => $metric->type,
                    'content' => $metric->content,
                    'review_action' => $metric->review_action,
                    'review_comment' => $metric->review_comment,
                ])->values(),
            ],
        ], 422);
    }

    private function pendingReviewValidationError(MstStandard $standard): ?JsonResponse
    {
        $pendingMetrics = MstMetric::where('standard_id', $standard->id)
            ->where('review_status', 'PENDING')
            ->orderBy('id')
            ->get(['id', 'type', 'content']);

        if ($pendingMetrics->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Standar belum dapat dikirim ke pimpinan karena masih ada node yang belum dicek auditor.',
            'errors' => [
                'metrics' => $pendingMetrics->map(fn (MstMetric $metric) => [
                    'id' => $metric->id,
                    'type' => $metric->type,
                    'content' => $metric->content,
                ])->values(),
            ],
        ], 422);
    }

    /**
     * Display a listing of the standards.
     */
    public function index(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReadStandards($request, 'Anda tidak memiliki hak akses untuk melihat daftar standar.')) {
            return $denied;
        }

        $query = MstStandard::query()->with(['previousStandard:id,name,version_number,periode_tahun', 'supersededByStandard:id,name,version_number,periode_tahun']);

        // Read-only users keep seeing the implemented version while a revision
        // draft is being prepared in parallel.
        if (! $this->canDraftStandards($request)) {
            $query->where(function ($builder) {
                $builder->where('is_active', true)
                    ->orWhere('status', 'TERBIT');
            });
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('periode_tahun')) {
            $query->where('periode_tahun', $request->periode_tahun);
        }

        $standards = $query->orderByDesc('created_at')
                           ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $standards,
        ]);
    }

    /**
     * Store a newly created standard.
     */
    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.create', 'Anda tidak memiliki hak akses untuk menambah standar.')) {
            return $denied;
        }

        $request->merge([
            'name' => Str::upper(trim((string) $request->input('name'))),
            'standard_code' => Str::upper(trim((string) $request->input('standard_code'))),
        ]);

        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255', Rule::unique('mst_standards', 'name')->whereNull('deleted_at')],
            'standard_code'      => ['required', 'string', 'max:255', 'regex:/^SPMI[\/-]UIM[\/-].+/i'],
            'category'           => 'required|in:' . $this->allowedCategories(),
            'periode_tahun'      => 'nullable|integer',
            'is_active'          => 'boolean',
            'referensi_regulasi' => 'nullable|string',
        ]);

        $standard = MstStandard::create($validated);
        $this->resetApprovalFlow($standard);
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dibuat.',
            'data'    => $standard,
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.create', 'Anda tidak memiliki hak akses untuk mengimpor standar.')) {
            return $denied;
        }

        if ($request->user()?->hasRole('Perumus')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Role Perumus hanya dapat membuat standar manual dan tidak dapat mengimpor dokumen.',
            ], 403);
        }

        $request->merge(['name' => Str::upper(trim((string) $request->input('name')))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('mst_standards', 'name')->whereNull('deleted_at')],
            'category' => 'required|in:' . $this->allowedCategories(),
            'periode_tahun' => 'nullable|integer',
            'is_active' => 'boolean',
            'referensi_regulasi' => 'nullable|string',
            'file' => 'required|file|mimes:pdf,docx|max:20480',
            'structure_tree' => 'nullable',
            'extracted_text' => 'nullable|string',
        ]);

        $uploadedFile = $request->file('file');
        $baseName = Str::slug(pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'standar';
        $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $uploadedFile->getClientOriginalExtension());

        $decodedStructureTree = null;
        if ($request->filled('structure_tree')) {
            $decodedStructureTree = json_decode((string) $request->input('structure_tree'), true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decodedStructureTree)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Format struktur standar tidak valid.',
                ], 422);
            }
        }

        $standard = null;
        $path = null;

        try {
            DB::beginTransaction();

            $standard = MstStandard::create([
                'name' => $validated['name'],
                'category' => $validated['category'],
                'periode_tahun' => $validated['periode_tahun'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'referensi_regulasi' => $validated['referensi_regulasi'] ?? null,
                'status' => 'DRAFT',
            ]);

            $directory = sprintf('standards/standard-%s/source-documents', $standard->id);
            $path = $uploadedFile->storeAs($directory, $storedName, 'local');

            $standard->forceFill([
                'source_document_path' => $path,
                'source_document_original_name' => $uploadedFile->getClientOriginalName(),
                'source_document_stored_name' => $storedName,
                'source_document_mime_type' => $uploadedFile->getMimeType(),
                'source_document_size_bytes' => $uploadedFile->getSize(),
                'imported_from_document_at' => now(),
            ]);
            $this->resetApprovalFlow($standard);
            $standard->save();

            $summary = $this->documentImportService->import(
                $standard,
                $decodedStructureTree,
                $validated['extracted_text'] ?? null,
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Dokumen standar berhasil diimpor beserta struktur poin-poinnya.',
                'data' => [
                    ...$standard->fresh()->toArray(),
                    'import_summary' => $summary,
                ],
            ], 201);
        } catch (\Throwable $exception) {
            DB::rollBack();

            if ($path) {
                Storage::disk('local')->delete($path);
            }

            if ($standard?->exists) {
                $standard->forceDelete();
            }

            throw $exception;
        }
    }

    /**
     * Display the specified standard.
     */
    public function show(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReadStandards($request, 'Anda tidak memiliki hak akses untuk melihat detail standar.')) {
            return $denied;
        }

        $standard = MstStandard::with([
            'previousStandard:id,name,version_number,periode_tahun,status',
            'supersededByStandard:id,name,version_number,periode_tahun,status',
            'newerVersions:id,name,periode_tahun,version_number,status,previous_standard_id',
            'improvements.finding:id,standard_id,metric_id,status,finding_summary,created_at',
            'improvements.newStandard:id,name,periode_tahun,version_number,status',
            'indicators:id,standard_id,type,number,content,order',
        ])->findOrFail($id);

        if (
            ! $this->canDraftStandards($request)
            && $standard->status === 'DRAFT'
            && $standard->previousStandard?->status === 'TERBIT'
        ) {
            $standard = MstStandard::with([
                'previousStandard:id,name,version_number,periode_tahun,status',
                'supersededByStandard:id,name,version_number,periode_tahun,status',
                'newerVersions:id,name,periode_tahun,version_number,status,previous_standard_id',
                'improvements.finding:id,standard_id,metric_id,status,finding_summary,created_at',
                'improvements.newStandard:id,name,periode_tahun,version_number,status',
                'indicators:id,standard_id,type,number,content,order',
            ])->findOrFail($standard->previous_standard_id);
        }

        $metricIds = MstMetric::query()
            ->where('standard_id', $standard->id)
            ->pluck('id');

        $borangItemIds = $metricIds->isEmpty()
            ? collect()
            : BorangItem::query()
                ->whereIn('metric_id', $metricIds)
                ->pluck('id');

        $implementationEvidenceCount = $borangItemIds->isEmpty()
            ? 0
            : TrxEvidence::query()
                ->whereIn('borang_item_id', $borangItemIds)
                ->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                ...$standard->toArray(),
                'implementation_summary' => [
                    'is_published' => $standard->status === 'TERBIT',
                    'evidence_count' => $implementationEvidenceCount,
                    'is_implemented' => $implementationEvidenceCount > 0,
                ],
            ],
        ]);
    }

    public function export(Request $request, $id): StreamedResponse|JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'report.export', 'Anda tidak memiliki hak akses untuk mengekspor standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'TERBIT') {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya standar berstatus TERBIT yang dapat diekspor.',
            ], 422);
        }

        if ($standard->source_document_path && Storage::disk('local')->exists($standard->source_document_path)) {
            return Storage::disk('local')->download(
                $standard->source_document_path,
                $standard->source_document_original_name ?? $standard->source_document_stored_name
            );
        }

        $html = $this->standardExportService->buildWordHtml($standard);
        $fileName = sprintf('%s-%s.doc', Str::slug($standard->name) ?: 'standar', $standard->periode_tahun ?: 'tanpa-periode');

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, $fileName, [
            'Content-Type' => 'application/msword; charset=UTF-8',
        ]);
    }

    public function downloadSourceDocument(Request $request, $id): StreamedResponse|JsonResponse
    {
        if ($denied = $this->denyUnlessCanReadStandards($request, 'Anda tidak memiliki hak akses untuk mengunduh dokumen sumber standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        abort_unless($standard->source_document_path, 404);
        abort_unless(Storage::disk('local')->exists($standard->source_document_path), 404);

        return Storage::disk('local')->download(
            $standard->source_document_path,
            $standard->source_document_original_name ?? $standard->source_document_stored_name
        );
    }

    /**
     * Update the specified standard.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanDraft($request, 'Anda tidak memiliki hak akses untuk mengubah standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengubah standar yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        if ($request->has('name')) {
            $request->merge(['name' => Str::upper(trim((string) $request->input('name')))]);
        }
        if ($request->has('standard_code')) {
            $request->merge(['standard_code' => Str::upper(trim((string) $request->input('standard_code')))]);
        }

        $validated = $request->validate([
            'name'               => ['sometimes', 'required', 'string', 'max:255', Rule::unique('mst_standards', 'name')->whereNull('deleted_at')->ignore($standard->id)],
            'standard_code'      => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^SPMI[\/-]UIM[\/-].+/i'],
            'category'           => 'sometimes|required|in:' . $this->allowedCategories(),
            'periode_tahun'      => 'nullable|integer',
            'is_active'          => 'boolean',
            'referensi_regulasi' => 'nullable|string',
        ]);

        $standard->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil diperbarui.',
            'data'    => $standard,
        ]);
    }

    /**
     * Remove the specified standard (Soft Delete).
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.delete', 'Anda tidak memiliki hak akses untuk menghapus standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        $isInitialDraft = $standard->status === 'DRAFT'
            && ! $standard->previous_standard_id;

        if (! $isInitialDraft) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya standar DRAFT yang belum diterapkan dan bukan salinan revisi yang dapat dihapus.'
            ], 403);
        }

        $standard->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dihapus.',
            'data'    => null,
        ]);
    }

    /**
     * Submit the specified standard for approval (Ajukan).
     */
    public function submit(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnless($request, 'standard.publish', 'Anda tidak memiliki hak akses untuk mengajukan standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if (!in_array($standard->status, ['DRAFT', 'REVISI'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya standar berstatus DRAFT atau REVISI yang dapat diajukan.'
            ], 400);
        }

        if ($error = $this->structureValidationError($standard)) {
            return $error;
        }

        $standard->status = 'WAITING_APPROVAL';
        $standard->approval_stage = 'HEAD_LPMI';
        $standard->submitted_by = auth()->id();
        $standard->approved_by = null;
        $standard->review_submitted_by = null;
        $standard->review_submitted_at = null;
        $standard->reject_reason = null;
        $this->resetApprovalFlow($standard);
        $standard->approval_stage = 'HEAD_LPMI';
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil diajukan ke Kepala LPMI.',
            'data'    => $standard,
        ]);
    }

    /**
     * Approve the specified standard (Setujui -> TERBIT).
     */
    public function approve(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReview($request, 'Anda tidak memiliki hak akses untuk menyetujui standar.')) {
            return $denied;
        }

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar tidak dalam status Menunggu Persetujuan.'
            ], 400);
        }

        if ($error = $this->structureValidationError($standard)) {
            return $error;
        }

        if ($error = $this->approveAsCurrentActor($request, $standard)) {
            return $error;
        }

        if ($standard->approval_stage === 'RECTOR' && $standard->rector_approved_at) {
            $standard->status = 'TERBIT';
            $standard->approval_stage = 'FINAL';
            $standard->approved_by = auth()->id();
            $standard->reject_reason = null;
            $this->activateRevisedStandard($standard);
            $standard->save();

            return response()->json([
                'status'  => 'success',
                'message' => 'Standar Mutu disetujui Rektor dan langsung diterbitkan.',
                'data'    => $standard,
            ]);
        }

        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Persetujuan berhasil direkam. Tahap berikutnya: ' . $this->currentApprovalLabel($standard) . '.',
            'data'    => $standard,
        ]);
    }

    /**
     * Reject the specified standard (Tolak -> REVISI).
     */
    public function reject(Request $request, $id): JsonResponse
    {
        if ($denied = $this->denyUnlessCanReview($request, 'Anda tidak memiliki hak akses untuk menolak standar.')) {
            return $denied;
        }

        $validated = $request->validate([
            'reason' => 'required|string'
        ]);

        $standard = MstStandard::findOrFail($id);

        if ($standard->status !== 'WAITING_APPROVAL') {
            return response()->json([
                'status' => 'error',
                'message' => 'Standar tidak dalam status Menunggu Persetujuan.'
            ], 400);
        }

        $standard->status = 'REVISI';
        $standard->approval_stage = 'REVISI';
        $standard->reject_reason = $validated['reason'];
        $this->resetApprovalFlow($standard);
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu telah ditolak dan dikembalikan untuk direvisi.',
            'data'    => $standard,
        ]);
    }

    public function submitReview(Request $request, $id): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Alur review auditor sudah tidak dipakai. Gunakan alur persetujuan berjenjang Kepala LPMI, Wakil Rektor, lalu Rektor.',
        ], 410);
    }
}
