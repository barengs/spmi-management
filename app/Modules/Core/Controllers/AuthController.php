<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuthController extends Controller
{
    private function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'nidn_npk' => $user->nidn_npk,
            'unit' => $user->unit?->only(['id', 'name', 'code', 'level']),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'signature' => [
                'has_file' => filled($user->signature_path),
                'original_name' => $user->signature_original_name,
                'mime_type' => $user->signature_mime_type,
                'size_bytes' => $user->signature_size_bytes,
            ],
        ];
    }

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
                'user'  => $this->transformUser($user),
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
            'data'   => $this->transformUser($user),
        ]);
    }

    /**
     * POST /api/v1/auth/refresh
     * Refresh the JWT token.
     */
    public function refresh(Request $request): JsonResponse
    {
        try {
            $newToken = auth('api')->refresh();
            
            return response()->json([
                'status'  => 'success',
                'message' => 'Token berhasil diperbarui.',
                'data'    => [
                    'token' => $newToken,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi tidak dapat diperbarui. Silakan login kembali.',
            ], 401);
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:200',
        ]);

        $user->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Nama akun berhasil diperbarui.',
            'data' => $this->transformUser($user->fresh()->load('unit')),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini tidak sesuai.'],
            ]);
        }

        $user->update([
            'password' => $validated['password'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Password berhasil diperbarui.',
            'data' => null,
        ]);
    }

    public function updateSignature(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'signature' => 'required|file|mimes:png,jpg,jpeg,webp|max:4096',
        ]);

        $file = $validated['signature'];
        $baseName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'signature';
        $storedName = sprintf('%s-%s.%s', $baseName, now()->format('YmdHis'), $file->getClientOriginalExtension());
        $directory = sprintf('signatures/user-%s', $user->id);

        if ($user->signature_path) {
            Storage::disk('local')->delete($user->signature_path);
        }

        $path = $file->storeAs($directory, $storedName, 'local');

        $user->forceFill([
            'signature_path' => $path,
            'signature_original_name' => $file->getClientOriginalName(),
            'signature_mime_type' => $file->getMimeType(),
            'signature_size_bytes' => $file->getSize(),
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Tanda tangan virtual berhasil diperbarui.',
            'data' => $this->transformUser($user->fresh()->load('unit')),
        ]);
    }

    public function removeSignature(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->signature_path) {
            Storage::disk('local')->delete($user->signature_path);
        }

        $user->forceFill([
            'signature_path' => null,
            'signature_original_name' => null,
            'signature_mime_type' => null,
            'signature_size_bytes' => null,
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Tanda tangan virtual berhasil dihapus.',
            'data' => $this->transformUser($user->fresh()->load('unit')),
        ]);
    }

    public function downloadSignature(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $user->signature_path || ! Storage::disk('local')->exists($user->signature_path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tanda tangan virtual belum tersedia.',
            ], 404);
        }

        return Storage::disk('local')->download(
            $user->signature_path,
            $user->signature_original_name ?? 'signature'
        );
    }
}
