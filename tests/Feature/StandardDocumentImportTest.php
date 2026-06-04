<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MstStandardIndicator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
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
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => UploadedFile::fake()->create('standar-import.pdf', 120, 'application/pdf'),
            'extracted_text' => implode("\n", [
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul dan berdaya saing.',
                'B. Misi',
                '1) Menyelenggarakan pendidikan bermutu.',
                '2) Melaksanakan penelitian unggul.',
                'IKU No. 9.1 Capaian pembelajaran lulusan.',
                'IKU No. 9.2 Prestasi akademik mahasiswa.',
                'IKU No. 9.2 Prestasi akademik mahasiswa.',
                'IKT No. 9.1 Target institusi.',
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
        $this->assertSame(2, $standard->iku_count);
        $this->assertSame(1, $standard->ikt_count);
        $this->assertCount(3, $standard->indicator_entries);
        $this->assertSame(3, MstStandardIndicator::where('standard_id', $standard->id)->count());
        $this->assertSame(2, MstStandardIndicator::where('standard_id', $standard->id)->where('type', 'IKU')->count());
        $this->assertSame(1, MstStandardIndicator::where('standard_id', $standard->id)->where('type', 'IKT')->count());
        $this->assertSame([
            'type' => 'IKU',
            'number' => '9.1',
            'content' => 'Capaian pembelajaran lulusan.',
        ], $standard->indicator_entries[0]);
    }

    public function test_standard_document_import_extracts_table_style_iku_ikt_codes_to_indicator_table(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Indikator Tabel',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => UploadedFile::fake()->create('standar-indikator.pdf', 120, 'application/pdf'),
            'extracted_text' => implode("\n", [
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul.',
                '8 Indikator Ketercapaian Standar Visi, Misi, Tujuan dan Strategi',
                '9 Dokumen Terkait Standar Visi, Misi, Tujuan dan Strategi',
                '8. Indikator Ketercapaian Standar',
                'No Sumber Indikator',
                'Strategi pencapaian tujuan disusun berdasarkan analisis yang',
                '5 IKU.05',
                '5 sistematis, serta pada pelaksanaannya dilakukan pemantauan',
                'dan evaluasi yang ditindaklanjuti',
                '6 IKT.01 Tersosialisasinya Visi dan Misi',
                '7 IKT.02 Terlaksananya survei visi dan misi',
                '9. Dokumen Terkait',
                'Dokumen pendukung standar.',
            ]),
        ]);

        $response->assertCreated();

        $standard = MstStandard::where('name', 'STANDAR INDIKATOR TABEL')->firstOrFail();
        $indicators = MstStandardIndicator::where('standard_id', $standard->id)->orderBy('order')->get();

        $this->assertSame(1, $standard->iku_count);
        $this->assertSame(2, $standard->ikt_count);
        $this->assertCount(3, $standard->indicator_entries);
        $this->assertCount(3, $indicators);
        $this->assertSame('IKU', $indicators[0]->type);
        $this->assertSame('05', $indicators[0]->number);
        $this->assertSame(
            'Strategi pencapaian tujuan disusun berdasarkan analisis yang sistematis, serta pada pelaksanaannya dilakukan pemantauan dan evaluasi yang ditindaklanjuti',
            $indicators[0]->content
        );
        $this->assertSame('IKT', $indicators[1]->type);
        $this->assertSame('01', $indicators[1]->number);
        $this->assertSame('Tersosialisasinya Visi dan Misi', $indicators[1]->content);
        $this->assertSame('IKT', $indicators[2]->type);
        $this->assertSame('02', $indicators[2]->number);
        $this->assertSame('Terlaksananya survei visi dan misi', $indicators[2]->content);
    }

    public function test_standard_document_import_stores_document_only_when_content_is_unreadable(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Dokumen Tidak Terbaca',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => UploadedFile::fake()->create('standar-scan.pdf', 120, 'application/pdf'),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.import_summary.root_count', 0);
        $response->assertJsonPath('data.import_summary.node_count', 0);
        $response->assertJsonPath('data.import_summary.document_only', true);

        $standard = MstStandard::where('name', 'STANDAR DOKUMEN TIDAK TERBACA')->firstOrFail();

        Storage::disk('local')->assertExists($standard->source_document_path);
        $this->assertNull($standard->standard_code);
        $this->assertNull($standard->document_date);
        $this->assertNull($standard->revision_number);
        $this->assertNull($standard->page_count);
        $this->assertNull($standard->iku_count);
        $this->assertNull($standard->ikt_count);
        $this->assertNull($standard->indicator_entries);
        $this->assertSame(0, MstMetric::where('standard_id', $standard->id)->count());
        $this->assertSame(0, MstStandardIndicator::where('standard_id', $standard->id)->count());
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
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => $uploadedFile,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('status', 'success');

        $standard = MstStandard::where('name', 'STANDAR AUTO PDF')->firstOrFail();
        Storage::disk('local')->assertExists($standard->source_document_path);

        $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->count());
        $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->where('type', 'Header')->count());
    }

    public function test_standard_document_import_can_build_tree_automatically_from_uploaded_docx(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();
        $section->addText('1. Visi dan Misi');
        $section->addText('A. Visi');
        $section->addText('Menjadi perguruan tinggi unggul.');
        $section->addText('B. Misi');
        $section->addText('1) Menyelenggarakan pendidikan bermutu.');

        $docxPath = tempnam(sys_get_temp_dir(), 'standard-import-') . '.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($docxPath);

        try {
            $uploadedFile = new UploadedFile(
                $docxPath,
                'standar-import.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                null,
                true
            );

            $response = $this->post('/api/v1/standards/import', [
                'name' => 'Standar Auto DOCX',
                'category' => 'Tambahan',
                'periode_tahun' => 2026,
                'file' => $uploadedFile,
            ]);

            $response->assertCreated();
            $response->assertJsonPath('status', 'success');

            $standard = MstStandard::where('name', 'STANDAR AUTO DOCX')->firstOrFail();
            Storage::disk('local')->assertExists($standard->source_document_path);

            $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->count());
            $this->assertGreaterThan(0, MstMetric::where('standard_id', $standard->id)->where('type', 'Header')->count());
        } finally {
            @unlink($docxPath);
        }
    }
}
