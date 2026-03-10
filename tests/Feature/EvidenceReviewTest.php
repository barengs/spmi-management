<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EvidenceReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_auditor_must_provide_comment_when_rejecting_evidence(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'audit.score.update', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'Auditor', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);

        $auditor = User::factory()->create();
        $auditor->assignRole($role);

        $owner = User::factory()->create();
        $standard = MstStandard::create([
            'name' => 'Standar Audit',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $indicator = MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => null,
            'content' => 'Indicator audit',
            'type' => 'Indicator',
            'order' => 1,
        ]);

        $evidence = TrxEvidence::create([
            'metric_id' => $indicator->id,
            'uploaded_by' => $owner->id,
            'source_type' => 'link',
            'title' => 'Bukti audit',
            'link_url' => 'https://example.com/bukti',
        ]);

        $response = $this->actingAs($auditor, 'api')->patchJson("/api/v1/evidences/{$evidence->id}/review", [
            'action' => 'reject',
            'comment' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('status', 'error');
    }
}
