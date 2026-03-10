<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class StandardStructureValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function actingAsLpmAdmin(): User
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.update', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);

        $user = User::factory()->create();
        $user->assignRole($role);

        $this->actingAs($user, 'api');

        return $user;
    }

    public function test_standard_cannot_be_submitted_when_statement_has_no_indicator(): void
    {
        $this->actingAsLpmAdmin();

        $standard = MstStandard::create([
            'name' => 'Standar Uji Struktur',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => null,
            'content' => 'Pernyataan tanpa indikator',
            'type' => 'Statement',
            'order' => 1,
        ]);

        $response = $this->patchJson("/api/v1/standards/{$standard->id}/submit");

        $response->assertStatus(422);
        $response->assertJsonPath('status', 'error');
    }

    public function test_indicator_cannot_be_created_as_root_node(): void
    {
        $this->actingAsLpmAdmin();

        $standard = MstStandard::create([
            'name' => 'Standar Root Indicator',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $response = $this->postJson('/api/v1/metrics', [
            'standard_id' => $standard->id,
            'parent_id' => null,
            'content' => 'Indicator akar',
            'type' => 'Indicator',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('status', 'error');
    }
}
