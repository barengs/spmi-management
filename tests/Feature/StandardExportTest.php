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
use ZipArchive;

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

    private function createDraftExportUser(): User
    {
        collect(['report.export', 'standard.update'])->each(
            fn (string $permission) => Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web'])
        );

        $role = Role::firstOrCreate(['name' => 'Perumus Export', 'guard_name' => 'web']);
        $role->syncPermissions(['report.export', 'standard.update']);

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
            'content' => json_encode([
                'kind' => 'TABLE',
                'intro_text' => 'Daftar indikator evaluasi:',
                'headers' => ['Sumber', 'Indikator'],
                'rows' => [['IKU.01', 'Dokumen evaluasi tersedia dan diperbarui.']],
                'table_note' => 'Tabel dapat diperbarui melalui builder.',
            ]),
            'type' => 'Indicator',
            'content_format' => 'TABLE',
            'order' => 1,
        ]);

        $response = $this->actingAs($user, 'api')
            ->get("/api/v1/standards/{$standard->id}/export");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $response->assertHeader('content-disposition');

        $content = file_get_contents($response->getFile()->getPathname());
        $temporaryPath = tempnam(sys_get_temp_dir(), 'standard-export-test-');
        file_put_contents($temporaryPath, $content);

        try {
            $zip = new ZipArchive();
            $this->assertTrue($zip->open($temporaryPath) === true);
            $documentXml = (string) $zip->getFromName('word/document.xml');
            $packageEntries = [];
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $packageEntries[] = (string) $zip->getNameIndex($index);
            }
            $zip->close();

            $this->assertStringContainsString('STANDAR MANUAL', $documentXml);
            $this->assertStringContainsString('Visi dan Misi', $documentXml);
            $this->assertStringContainsString('TABEL PERSETUJUAN', $documentXml);
            $this->assertStringContainsString('Kepala LPMI', $documentXml);
            $this->assertStringContainsString('Rektor', $documentXml);
            $this->assertStringContainsString('IKU.01', $documentXml);
            $this->assertGreaterThanOrEqual(5, substr_count($documentXml, '<w:tbl>'));
            $this->assertTrue(
                collect($packageEntries)->contains(fn (string $entry): bool => str_starts_with($entry, 'word/media/')),
                'The exported DOCX must contain an embedded logo.'
            );
        } finally {
            @unlink($temporaryPath);
        }
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

    public function test_draft_revision_export_contains_latest_edited_content_for_drafting_user(): void
    {
        $user = $this->createDraftExportUser();
        $standard = MstStandard::create([
            'name' => 'Standar Draft Revisi',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'is_active' => false,
            'status' => 'DRAFT',
        ]);

        MstMetric::create([
            'standard_id' => $standard->id,
            'content' => 'Konten revisi terbaru dari builder',
            'type' => 'Header',
            'content_format' => 'SUB_POINT',
            'order' => 1,
        ]);

        $response = $this->actingAs($user, 'api')
            ->get("/api/v1/standards/{$standard->id}/export");

        $response->assertOk();
        $this->assertStringContainsString('draft-revisi.docx', $response->headers->get('content-disposition'));

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($response->getFile()->getPathname()) === true);
        $documentXml = (string) $zip->getFromName('word/document.xml');
        $zip->close();

        $this->assertStringContainsString('Konten revisi terbaru dari builder', $documentXml);
    }
}
