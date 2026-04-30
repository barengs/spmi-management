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

class StandardExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function createExportUser(): User
    {
        Permission::firstOrCreate(['name' => 'report.export', 'guard_name' => 'web']);

        $role = Role::firstOrCreate(['name' => 'Pimpinan', 'guard_name' => 'web']);
        $role->syncPermissions(['report.export']);

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_published_standard_can_be_exported_as_word_document_with_approval_table(): void
    {
        $user = $this->createExportUser();

        $standard = MstStandard::create([
            'name' => 'Standar Manual',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'TERBIT',
            'referensi_regulasi' => 'Peraturan Internal',
            'head_lpmi_approved_at' => now()->subDays(4),
            'wr1_approved_at' => now()->subDays(3),
            'wr2_approved_at' => now()->subDays(3),
            'wr3_approved_at' => now()->subDays(3),
            'rector_approved_at' => now()->subDay(),
        ]);

        $header = MstMetric::create([
            'standard_id' => $standard->id,
            'content' => '1. Visi dan Misi',
            'type' => 'Header',
            'order' => 1,
        ]);

        $statement = MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => $header->id,
            'content' => 'a. Kebijakan mutu ditetapkan secara berkala.',
            'type' => 'Statement',
            'order' => 1,
        ]);

        MstMetric::create([
            'standard_id' => $standard->id,
            'parent_id' => $statement->id,
            'content' => '1) Dokumen evaluasi tersedia dan diperbarui.',
            'type' => 'Indicator',
            'order' => 1,
        ]);

        $response = $this->actingAs($user, 'api')
            ->get("/api/v1/standards/{$standard->id}/export");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/msword; charset=UTF-8');
        $response->assertHeader('content-disposition');

        $content = $response->streamedContent();

        $this->assertStringContainsString('Standar Manual', $content);
        $this->assertStringContainsString('1. Visi dan Misi', $content);
        $this->assertStringContainsString('Tabel Persetujuan', $content);
        $this->assertStringContainsString('Kepala LPMI', $content);
        $this->assertStringContainsString('Rektor', $content);
    }

    public function test_non_published_standard_cannot_be_exported(): void
    {
        $user = $this->createExportUser();

        $standard = MstStandard::create([
            'name' => 'Standar Draft',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'is_active' => true,
            'status' => 'DRAFT',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson("/api/v1/standards/{$standard->id}/export");

        $response->assertStatus(422);
        $response->assertJsonPath('status', 'error');
    }
}
