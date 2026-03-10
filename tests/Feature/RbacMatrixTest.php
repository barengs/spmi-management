<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_superadmin_bypasses_gate_checks(): void
    {
        $user = User::factory()->create();
        $role = Role::create(['name' => 'SuperAdmin', 'guard_name' => 'web']);
        $user->assignRole($role);

        $this->assertTrue(Gate::forUser($user)->allows('role.manage'));
    }

    public function test_authorized_user_can_view_rbac_matrix(): void
    {
        $permission = Permission::create(['name' => 'role.manage', 'guard_name' => 'web']);
        $role = Role::create(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);

        $user = User::factory()->create();
        $user->assignRole($role);

        $response = $this->actingAs($user, 'api')->getJson('/api/v1/rbac/matrix');

        $response->assertOk();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonStructure([
            'status',
            'data' => [
                'roles',
                'permissions',
            ],
        ]);
    }

    public function test_authorized_user_can_update_role_permissions(): void
    {
        $managePermission = Permission::create(['name' => 'role.manage', 'guard_name' => 'web']);
        $viewPermission = Permission::create(['name' => 'report.view', 'guard_name' => 'web']);

        $adminRole = Role::create(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $targetRole = Role::create(['name' => 'Auditor', 'guard_name' => 'web']);
        $adminRole->givePermissionTo($managePermission);

        $user = User::factory()->create();
        $user->assignRole($adminRole);

        $response = $this->actingAs($user, 'api')->putJson("/api/v1/rbac/roles/{$targetRole->id}", [
            'permission_names' => ['report.view'],
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'success');

        $this->assertTrue($targetRole->fresh()->hasPermissionTo('report.view'));
    }
}
