<?php

namespace App\Modules\Core\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('role.manage')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengelola role dan permission.',
            ], 403);
        }

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->map(function (Permission $permission) {
                [$module, $action] = array_pad(explode('.', $permission->name, 2), 2, null);

                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'module' => $module,
                    'action' => $action,
                    'label' => str($permission->name)->replace('.', ' ')->title()->toString(),
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'roles' => $roles,
                'permissions' => $permissions,
            ],
        ]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if (! $request->user()?->can('role.manage')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengelola role dan permission.',
            ], 403);
        }

        $validated = $request->validate([
            'permission_names' => 'required|array',
            'permission_names.*' => 'string|exists:permissions,name',
        ]);

        $role->syncPermissions($validated['permission_names']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'status' => 'success',
            'message' => "Permission untuk role {$role->name} berhasil diperbarui.",
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->fresh('permissions')->permissions->pluck('name')->values(),
            ],
        ]);
    }
}
