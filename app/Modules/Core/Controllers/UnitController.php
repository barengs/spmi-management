<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UnitController extends Controller
{
    /**
     * GET /api/v1/units
     * Return full tree structure.
     */
    public function index(Request $request): JsonResponse
    {
        $tree = Unit::with('allChildren')
                    ->whereNull('parent_id')
                    ->where('is_active', true)
                    ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $tree,
        ]);
    }

    /**
     * GET /api/v1/units/flat
     * Return flat list for dropdowns.
     */
    public function flat(): JsonResponse
    {
        $units = Unit::select('id', 'parent_id', 'name', 'code', 'level')
                     ->where('is_active', true)
                     ->orderBy('level')
                     ->orderBy('name')
                     ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $units,
        ]);
    }

    /**
     * POST /api/v1/units
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:ref_units,id',
            'name'      => 'required|string|max:200',
            'code'      => 'nullable|string|max:20|unique:ref_units,code',
            'level'     => 'required|in:university,faculty,department,bureau',
            'is_active' => 'boolean',
        ]);

        // Validate parent_id is not self-referential
        if (isset($validated['parent_id'])) {
            $parent = Unit::find($validated['parent_id']);
            if (! $parent) {
                return response()->json([
                    'status'  => 'error',
                    'code'    => 'UNIT_NOT_FOUND',
                    'message' => 'Unit induk tidak ditemukan.',
                ], 404);
            }
        }

        $unit = Unit::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Unit berhasil dibuat.',
            'data'    => $unit,
        ], 201);
    }

    /**
     * GET /api/v1/units/{id}
     */
    public function show(int $id): JsonResponse
    {
        $unit = Unit::with('parent', 'children', 'users:id,name,nidn_npk,unit_id')
                    ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $unit,
        ]);
    }

    /**
     * PUT /api/v1/units/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $unit = Unit::findOrFail($id);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:ref_units,id',
            'name'      => 'sometimes|string|max:200',
            'code'      => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('ref_units', 'code')->ignore($id)],
            'level'     => 'sometimes|in:university,faculty,department,bureau',
            'is_active' => 'sometimes|boolean',
        ]);

        // Prevent circular assignment
        if (isset($validated['parent_id']) && $validated['parent_id'] !== null) {
            if ($unit->isCircular($validated['parent_id'])) {
                return response()->json([
                    'status'  => 'error',
                    'code'    => 'CIRCULAR_REFERENCE',
                    'message' => 'Parent ID menyebabkan circular reference.',
                    'errors'  => ['parent_id' => ['Unit tidak dapat menjadi turunannya sendiri.']],
                ], 422);
            }
        }

        $unit->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Unit berhasil diperbarui.',
            'data'    => $unit->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/units/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $unit = Unit::findOrFail($id);

        // Prevent deletion if unit has active users
        if ($unit->users()->count() > 0) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'UNIT_HAS_USERS',
                'message' => 'Unit tidak bisa dihapus karena memiliki pengguna aktif.',
            ], 422);
        }

        $unit->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Unit berhasil dihapus.',
            'data'    => null,
        ]);
    }
}
