<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    private const STANDARD_CYCLE_DURATION_KEY = 'standard_cycle_duration_months';
    private const DEFAULT_STANDARD_CYCLE_DURATION_MONTHS = 4;

    private function denyUnlessManage(Request $request): ?JsonResponse
    {
        if (! $request->user()?->can('role.manage')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengelola pengaturan siklus.',
            ], 403);
        }

        return null;
    }

    public function showCycleDuration(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessManage($request)) {
            return $denied;
        }

        $setting = AppSetting::query()->firstOrCreate(
            ['key' => self::STANDARD_CYCLE_DURATION_KEY],
            ['value' => (string) self::DEFAULT_STANDARD_CYCLE_DURATION_MONTHS]
        );

        return response()->json([
            'status' => 'success',
            'data' => [
                'key' => self::STANDARD_CYCLE_DURATION_KEY,
                'duration_months' => (int) $setting->value,
                'default_months' => self::DEFAULT_STANDARD_CYCLE_DURATION_MONTHS,
            ],
        ]);
    }

    public function updateCycleDuration(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessManage($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'duration_months' => 'required|integer|min:1|max:24',
        ]);

        $setting = AppSetting::query()->updateOrCreate(
            ['key' => self::STANDARD_CYCLE_DURATION_KEY],
            ['value' => (string) $validated['duration_months']]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Durasi siklus formulasi sampai approval berhasil diperbarui.',
            'data' => [
                'key' => self::STANDARD_CYCLE_DURATION_KEY,
                'duration_months' => (int) $setting->value,
                'default_months' => self::DEFAULT_STANDARD_CYCLE_DURATION_MONTHS,
            ],
        ]);
    }
}
