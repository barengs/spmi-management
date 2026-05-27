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
    private function denyUnlessCanManage(Request $request): ?JsonResponse
    {
        if (! $request->user()?->can('role.manage')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak memiliki hak akses untuk mengelola role dan permission.',
            ], 403);
        }

        return null;
    }

    private function transformPermission(Permission $permission): array
    {
        [$module, $action] = array_pad(explode('.', $permission->name, 2), 2, null);

        return [
            'id' => $permission->id,
            'name' => $permission->name,
            'module' => $module,
            'action' => $action,
            'label' => str($permission->name)->replace('.', ' ')->title()->toString(),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'permission_names' => 'nullable|array',
            'permission_names.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($validated['permission_names'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'status' => 'success',
            'message' => "Role {$role->name} berhasil dibuat.",
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->fresh('permissions')->permissions->pluck('name')->values(),
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'category' => in_array($role->name, ['Perumus', 'Pemeriksa', 'Persetujuan', 'Pertimbangan', 'Pengendalian'], true)
                    ? 'standard'
                    : (in_array($role->name, ['Auditor', 'Lead Auditor', 'Auditee'], true) ? 'audit' : 'general'),
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => $this->transformPermission($permission))
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
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
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

    public function permissionIndex(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => $this->transformPermission($permission))
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $permissions,
        ]);
    }

    public function permissionShow(Request $request, Permission $permission): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->transformPermission($permission),
        ]);
    }

    public function permissionStore(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'module' => 'required|string|max:50|regex:/^[a-z][a-z0-9_]*$/',
            'action' => 'required|string|max:50|regex:/^[a-z][a-z0-9_]*$/',
        ]);

        $name = "{$validated['module']}.{$validated['action']}";

        if (Permission::query()->where('name', $name)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Permission dengan nama tersebut sudah ada.',
            ], 422);
        }

        $permission = Permission::create([
            'name' => $name,
            'guard_name' => 'web',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'status' => 'success',
            'message' => 'Permission berhasil dibuat.',
            'data' => $this->transformPermission($permission),
        ], 201);
    }

    public function permissionUpdate(Request $request, Permission $permission): JsonResponse
    {
        if ($denied = $this->denyUnlessCanManage($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'module' => 'required|string|max:50|regex:/^[a-z][a-z0-9_]*$/',
            'action' => 'required|string|max:50|regex:/^[a-z][a-z0-9_]*$/',
        ]);

        $name = "{$validated['module']}.{$validated['action']}";

        if (Permission::query()->where('name', $name)->where('id', '!=', $permission->id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Permission dengan nama tersebut sudah ada.',
            ], 422);
        }

        $permission->update([
            'name' => $name,
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return response()->json([
            'status' => 'success',
            'message' => 'Permission berhasil diperbarui.',
            'data' => $this->transformPermission($permission->fresh()),
        ]);
    }
}
