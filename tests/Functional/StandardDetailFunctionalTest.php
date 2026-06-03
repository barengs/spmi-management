<?php

namespace Tests\Functional;

use App\Models\User;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class StandardDetailFunctionalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_user_with_standard_view_permission_can_open_standard_detail_endpoint(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.view', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'Observer', 'guard_name' => 'web']);
        $role->givePermissionTo([$permission]);

        $user = User::factory()->create();
        $user->assignRole($role);

        $standard = MstStandard::create([
            'name' => 'Standar Uji Fungsional',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson("/api/v1/standards/{$standard->id}");

        $response->assertOk();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.id', $standard->id);
        $response->assertJsonPath('data.name', 'Standar Uji Fungsional');
    }
}
