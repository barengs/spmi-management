<?php

namespace App\Modules\Standard\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StandardController extends Controller
{
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
        $standard->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Dokumen standar berhasil dihapus.',
            'data'    => null,
        ]);
    }
}
