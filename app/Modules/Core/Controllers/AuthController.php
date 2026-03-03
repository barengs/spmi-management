<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/login
     * Login with email + password, returns Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with('unit')
                    ->where('email', $request->email)
                    ->where('is_active', true)
                    ->withoutTrashed()
                    ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        // Revoke previous tokens (single session per user)
        $user->tokens()->delete();

        $token = $user->createToken('espmi-spa')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Login berhasil.',
            'data'    => [
                'token' => $token,
                'user'  => [
                    'id'       => $user->id,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'nidn_npk' => $user->nidn_npk,
                    'unit'     => $user->unit?->only(['id', 'name', 'code', 'level']),
                    'roles'    => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ],
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logout berhasil.',
            'data'    => null,
        ]);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('unit');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'          => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'nidn_npk'    => $user->nidn_npk,
                'unit'        => $user->unit?->only(['id', 'name', 'code', 'level']),
                'roles'       => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
        ]);
    }
}
