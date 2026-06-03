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

class StandardRevisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_published_standard_revision_creates_one_inactive_draft_copy(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.update', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);

        $user = User::factory()->create();
        $user->assignRole($role);

        $published = MstStandard::create([
            'name' => 'Standar Terimplementasi',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'version_number' => 1,
            'is_active' => true,
            'status' => 'TERBIT',
            'approval_stage' => 'FINAL',
        ]);

        MstMetric::create([
            'standard_id' => $published->id,
            'content' => 'Poin versi terbit',
            'type' => 'Header',
            'content_format' => 'SUB_POINT',
            'order' => 1,
        ]);

        $firstResponse = $this->actingAs($user, 'api')
            ->postJson("/api/v1/standards/{$published->id}/revise");

        $firstResponse->assertCreated();
        $firstResponse->assertJsonPath('data.status', 'DRAFT');
        $firstResponse->assertJsonPath('data.is_active', false);
        $firstResponse->assertJsonPath('data.previous_standard_id', $published->id);
        $firstResponse->assertJsonPath('data.version_number', 2);

        $draftId = $firstResponse->json('data.id');

        $this->assertDatabaseHas('mst_standards', [
            'id' => $published->id,
            'status' => 'TERBIT',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('mst_metrics', [
            'standard_id' => $draftId,
            'content' => 'Poin versi terbit',
        ]);

        $secondResponse = $this->postJson("/api/v1/standards/{$published->id}/revise");

        $secondResponse->assertOk();
        $secondResponse->assertJsonPath('data.id', $draftId);
        $this->assertSame(1, MstStandard::where('previous_standard_id', $published->id)->count());
    }

    public function test_standard_name_is_stored_uppercase_and_must_be_unique(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.create', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);

        $user = User::factory()->create();
        $user->assignRole($role);

        $firstResponse = $this->actingAs($user, 'api')->postJson('/api/v1/standards', [
            'name' => 'Standar Nama Unik',
            'standard_code' => 'SPMI/UIM/SMP/II/A',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
        ]);

        $firstResponse->assertCreated();
        $firstResponse->assertJsonPath('data.name', 'STANDAR NAMA UNIK');

        $duplicateResponse = $this->postJson('/api/v1/standards', [
            'name' => 'standar nama unik',
            'standard_code' => 'SPMI/UIM/SMP/II/B',
            'category' => 'Tambahan',
            'periode_tahun' => 2027,
        ]);

        $duplicateResponse->assertStatus(422);
        $duplicateResponse->assertJsonValidationErrors('name');
    }
}
