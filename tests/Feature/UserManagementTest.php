<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_superadmin_can_create_user_from_user_management_feature(): void
    {
        Notification::fake();

        $superAdminRole = Role::create(['name' => 'SuperAdmin', 'guard_name' => 'web']);
        Role::create(['name' => 'Auditor', 'guard_name' => 'web']);

        $superAdmin = User::factory()->create([
            'email' => 'admin@espmi.dev',
            'is_active' => true,
        ]);
        $superAdmin->assignRole($superAdminRole);

        $response = $this->actingAs($superAdmin, 'api')->postJson('/api/v1/users', [
            'nidn_npk' => 'AUD999',
            'name' => 'Auditor Baru',
            'email' => 'auditor.baru@espmi.dev',
            'roles' => ['Auditor'],
            'is_active' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.email', 'auditor.baru@espmi.dev');
        $response->assertJsonPath('data.roles.0.name', 'Auditor');

        $createdUser = User::where('email', 'auditor.baru@espmi.dev')->firstOrFail();

        $this->assertSame('AUD999', $createdUser->nidn_npk);
        $this->assertTrue($createdUser->is_active);
        $this->assertTrue($createdUser->hasRole('Auditor'));
    }
}
