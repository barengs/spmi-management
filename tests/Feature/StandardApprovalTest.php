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

class StandardApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function createPimpinanUser(): User
    {
        Permission::firstOrCreate(['name' => 'standard.view', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'standard.publish', 'guard_name' => 'web']);

        $role = Role::firstOrCreate(['name' => 'Pimpinan', 'guard_name' => 'web']);
        $role->syncPermissions(['standard.view', 'standard.publish']);

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_pimpinan_can_approve_waiting_standard_after_auditor_submission(): void
    {
        $pimpinan = $this->createPimpinanUser();

        $standard = MstStandard::create([
            'name' => 'Standar Persetujuan Pimpinan',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'WAITING_APPROVAL',
            'review_submitted_by' => $pimpinan->id,
            'review_submitted_at' => now(),
        ]);

        MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => null,
            'content' => 'Header siap terbit',
            'type' => 'Header',
            'order' => 1,
            'review_status' => 'ACCEPTED',
            'reviewed_by' => $pimpinan->id,
            'reviewed_at' => now(),
        ]);

        $response = $this->actingAs($pimpinan, 'api')
            ->patchJson("/api/v1/standards/{$standard->id}/approve");

        $response->assertOk();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.status', 'TERBIT');
        $response->assertJsonPath('data.approved_by', $pimpinan->id);
    }
}
