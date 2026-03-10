<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StandardController extends Controller
{
    private function structureValidationError(MstStandard $standard): ?JsonResponse
    {
        $invalidStatements = $standard->statementsWithoutIndicators();

        if ($invalidStatements->isEmpty()) {
            return null;
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Masih ada Statement yang belum memiliki minimal satu Indicator.',
            'errors' => [
                'statements' => $invalidStatements->map(fn ($statement) => [
                    'id' => $statement->id,
                    'content' => $statement->content,
                ])->values(),
            ],
        ], 422);
    }

    /**
     * Display a listing of the standards.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MstStandard::query();

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('periode_tahun')) {
            $query->where('periode_tahun', $request->periode_tahun);
        }

        $standards = $query->orderBy('periode_tahun', 'desc')
                           ->orderBy('name')
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
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'category'           => 'required|in:SN-Dikti,Institusi',
            'periode_tahun'      => 'nullable|integer',
            'is_active'          => 'boolean',
            'referensi_regulasi' => 'nullable|string',
        ]);

        $standard = MstStandard::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dibuat.',
            'data'    => $standard,
        ], 201);
    }

    /**
     * Display the specified standard.
     */
    public function show($id): JsonResponse
    {
        $standard = MstStandard::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $standard,
        ]);
    }

    /**
     * Update the specified standard.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $standard = MstStandard::findOrFail($id);

        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengubah standar yang sedang Diajukan atau sudah Diterbitkan.'
            ], 403);
        }

        $validated = $request->validate([
            'name'               => 'sometimes|required|string|max:255',
            'category'           => 'sometimes|required|in:SN-Dikti,Institusi',
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
    public function destroy($id): JsonResponse
    {
        $standard = MstStandard::findOrFail($id);

        if (in_array($standard->status, ['WAITING_APPROVAL', 'TERBIT'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus standar yang sedang Diajukan atau sudah Diterbitkan.'
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
    public function submit($id): JsonResponse
    {
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
        $standard->submitted_by = auth()->id();
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil diajukan untuk ditinjau.',
            'data'    => $standard,
        ]);
    }

    /**
     * Approve the specified standard (Setujui -> TERBIT).
     */
    public function approve($id): JsonResponse
    {
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

        $standard->status = 'TERBIT';
        $standard->approved_by = auth()->id();
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu berhasil Diterbitkan.',
            'data'    => $standard,
        ]);
    }

    /**
     * Reject the specified standard (Tolak -> REVISI).
     */
    public function reject(Request $request, $id): JsonResponse
    {
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
        $standard->reject_reason = $validated['reason'];
        $standard->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Standar Mutu telah ditolak dan dikembalikan untuk direvisi.',
            'data'    => $standard,
        ]);
    }
}
