<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class StandardDocumentImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function actingAsLpmAdmin(): User
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.create', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->givePermissionTo([$permission]);

        $user = User::factory()->create();
        $user->assignRole($role);

        $this->actingAs($user, 'api');

        return $user;
    }

    public function test_standard_document_import_stores_uploaded_pdf_and_metric_tree(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Hasil Import',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'file' => UploadedFile::fake()->create('standar-import.pdf', 120, 'application/pdf'),
            'extracted_text' => implode("\n", [
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul dan berdaya saing.',
                'B. Misi',
                '1) Menyelenggarakan pendidikan bermutu.',
                '2) Melaksanakan penelitian unggul.',
            ]),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');

        $standard = MstStandard::firstOrFail();
        $this->assertNotNull($standard->source_document_path);
        $this->assertNotNull($standard->imported_from_document_at);
        Storage::disk('local')->assertExists($standard->source_document_path);

        $this->assertGreaterThanOrEqual(5, MstMetric::count());
        $this->assertSame(1, MstMetric::where('type', 'Header')->count());
        $this->assertSame(2, MstMetric::where('type', 'Statement')->count());
        $this->assertSame(3, MstMetric::where('type', 'Indicator')->count());
    }

    public function test_standard_document_import_can_build_tree_automatically_from_uploaded_pdf(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $sourcePath = base_path('documents/examples/standart-1.pdf');
        $uploadedFile = new UploadedFile(
            $sourcePath,
            'standart-1.pdf',
            'application/pdf',
            null,
            true
        );

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Auto PDF',
            'category' => 'Institusi',
            'periode_tahun' => 2026,
            'file' => $uploadedFile,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');

        $standard = MstStandard::where('name', 'Standar Auto PDF')->firstOrFail();
        Storage::disk('local')->assertExists($standard->source_document_path);

        $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->count());
        $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->where('type', 'Header')->count());
    }
}
