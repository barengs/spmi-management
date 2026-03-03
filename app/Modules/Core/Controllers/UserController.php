<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/v1/users
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::with('unit', 'roles')
                     ->when($request->get('unit_id'), fn($q, $v) => $q->where('unit_id', $v))
                     ->when($request->get('role'), fn($q, $v) => $q->role($v))
                     ->when($request->get('search'), fn($q, $v) => $q->where(function ($sub) use ($v) {
                         $sub->where('name', 'like', "%{$v}%")
                             ->orWhere('email', 'like', "%{$v}%")
                             ->orWhere('nidn_npk', 'like', "%{$v}%");
                     }))
                     ->orderBy('name')
                     ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data'   => $users,
        ]);
    }

    /**
     * POST /api/v1/users
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nidn_npk' => 'nullable|string|max:20|unique:users,nidn_npk',
            'name'     => 'required|string|max:200',
            'email'    => 'required|email|unique:users,email',
            'unit_id'  => 'nullable|exists:ref_units,id',
            'roles'    => 'nullable|array',
            'roles.*'  => 'string|exists:roles,name',
            'is_active' => 'boolean',
        ]);

        // Generate a temporary secure password
        $tempPassword = \Str::random(12);

        $user = User::create([
            ...$validated,
            'password' => $tempPassword,
        ]);

        // Assign roles
        if (! empty($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        // Send password reset link (acts as email verification + first-time password set)
        Password::sendResetLink(['email' => $user->email]);

        ActivityLog::record('POST', User::class, $user->id, null, $user->toArray());

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengguna berhasil dibuat. Email verifikasi telah dikirim.',
            'data'    => $user->load('unit', 'roles'),
        ], 201);
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with('unit', 'roles', 'permissions')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $user,
        ]);
    }

    /**
     * PUT /api/v1/users/{id}
     * Note: password cannot be updated directly. Use force-reset endpoint.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $oldData = $user->toArray();

        $validated = $request->validate([
            'nidn_npk' => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users', 'nidn_npk')->ignore($id)],
            'name'     => 'sometimes|string|max:200',
            'email'    => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($id)],
            'unit_id'  => 'nullable|exists:ref_units,id',
            'roles'    => 'nullable|array',
            'roles.*'  => 'string|exists:roles,name',
            'is_active' => 'sometimes|boolean',
        ]);

        // Extract roles before update
        $roles = $validated['roles'] ?? null;
        unset($validated['roles']);

        $user->update($validated);

        if ($roles !== null) {
            $user->syncRoles($roles);
        }

        ActivityLog::record('PUT', User::class, $user->id, $oldData, $user->fresh()->toArray());

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengguna berhasil diperbarui.',
            'data'    => $user->fresh()->load('unit', 'roles'),
        ]);
    }

    /**
     * DELETE /api/v1/users/{id}
     * Soft delete only.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Cannot delete yourself
        if (auth()->id() === $user->id) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'SELF_DELETE',
                'message' => 'Anda tidak bisa menghapus akun Anda sendiri.',
            ], 422);
        }

        ActivityLog::record('DELETE', User::class, $user->id, $user->toArray(), null);
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengguna berhasil dinonaktifkan.',
            'data'    => null,
        ]);
    }

    /**
     * POST /api/v1/users/{id}/force-reset
     * Admin send password reset link.
     */
    public function forceReset(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        Password::sendResetLink(['email' => $user->email]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Link reset password telah dikirim ke email pengguna.',
            'data'    => null,
        ]);
    }
}
