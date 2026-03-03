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
        $credentials = $request->only('email', 'password');

        if (! $token = auth('api')->attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        $user = auth('api')->user()->load('unit');

        if (! $user->is_active) {
            auth('api')->logout();
            throw ValidationException::withMessages([
                'email' => ['Akun Anda berstatus tidak aktif.'],
            ]);
        }

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
        auth('api')->logout();


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
