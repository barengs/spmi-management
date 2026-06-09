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
        $permissions = collect(['standard.create', 'standard.publish'])
            ->map(fn (string $name) => Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']));
        $role = Role::firstOrCreate(['name' => 'LPM-Admin', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::factory()->create();
        $user->assignRole($role);

        $this->actingAs($user, 'api');

        return $user;
    }

    private function actingAsPublishingAdmin(): User
    {
        $permissions = collect(['standard.create', 'standard.publish'])
            ->map(fn (string $name) => Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']));
        $role = Role::firstOrCreate(['name' => 'Publishing Admin', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::factory()->create();
        $user->assignRole($role);
        $this->actingAs($user, 'api');

        return $user;
    }

    private function actingAsCreateOnlyUser(): User
    {
        $permission = Permission::firstOrCreate(['name' => 'standard.create', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'Create Only Standard User', 'guard_name' => 'web']);
        $role->syncPermissions([$permission]);

        $user = User::factory()->create();
        $user->assignRole($role);
        $this->actingAs($user, 'api');

        return $user;
    }

    private function createDocxUpload(string $name, array $lines = []): UploadedFile
    {
        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        foreach ($lines as $line) {
            $section->addText($line);
        }

        $path = tempnam(sys_get_temp_dir(), 'standard-docx-fixture-') . '.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($path);

        return new UploadedFile(
            $path,
            $name,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        );
    }

    public function test_standard_document_import_stores_uploaded_docx_and_metric_tree(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Hasil Import',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => $this->createDocxUpload('standar-import.docx', ['Dokumen standar']),
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
        $this->assertSame('TERBIT', $standard->status);
        $this->assertSame('FINAL', $standard->approval_stage);
        $this->assertTrue((bool) $standard->is_active);
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
            'file' => $this->createDocxUpload('standar-indikator.docx', ['Dokumen indikator']),
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
            'file' => $this->createDocxUpload('standar-tidak-terbaca.docx'),
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

    public function test_standard_document_import_accepts_pdf_and_stores_document_when_unreadable(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->postJson('/api/v1/standards/import', [
            'name' => 'Standar PDF Disimpan',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => UploadedFile::fake()->create('standar.pdf', 120, 'application/pdf'),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.import_summary.document_only', true);

        $standard = MstStandard::where('name', 'STANDAR PDF DISIMPAN')->firstOrFail();
        $this->assertNotNull($standard->source_document_path);
        Storage::disk('local')->assertExists($standard->source_document_path);
        $this->assertSame(0, MstMetric::where('standard_id', $standard->id)->count());
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
        $metadataTable = $section->addTable();
        $metadataTable->addRow();
        $metadataTable->addCell()->addText('Kode');
        $metadataTable->addCell()->addText('SPMI-UIM/SMPus/IX');
        $metadataTable->addRow();
        $metadataTable->addCell()->addText('Tanggal');
        $metadataTable->addCell()->addText('12 April 2022');
        $metadataTable->addRow();
        $metadataTable->addCell()->addText('Revisi');
        $metadataTable->addCell()->addText('4');
        $metadataTable->addRow();
        $metadataTable->addCell()->addText('Halaman');
        $metadataTable->addCell()->addText('1-15');

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
            $this->assertSame('SPMI-UIM/SMPus/IX', $standard->standard_code);
            $this->assertSame('12 April 2022', $standard->document_date);
            $this->assertSame(4, $standard->revision_number);
            $this->assertSame(15, $standard->page_count);
        } finally {
            @unlink($docxPath);
        }
    }

    public function test_docx_metadata_normalizes_table_separators_and_split_code_spacing(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Metadata Terpisah',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => $this->createDocxUpload('metadata.docx', ['Dokumen standar']),
            'extracted_text' => implode("\n", [
                'Kode | : SPMI-UIM/SMP us /I X',
                'Tanggal | : 12 April 2022',
                'Revisi | : 4',
                'Halaman | : 1-15',
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul.',
            ]),
        ]);

        $response->assertCreated();

        $standard = MstStandard::where('name', 'STANDAR METADATA TERPISAH')->firstOrFail();
        $this->assertSame('SPMI-UIM/SMPus/IX', $standard->standard_code);
        $this->assertSame('12 April 2022', $standard->document_date);
        $this->assertSame(4, $standard->revision_number);
        $this->assertSame(15, $standard->page_count);
    }

    public function test_docx_metadata_supports_common_label_and_value_variations(): void
    {
        Storage::fake('local');
        $this->actingAsLpmAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Variasi Metadata',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => $this->createDocxUpload('variasi-metadata.docx', ['Dokumen standar']),
            'extracted_text' => implode("\n", [
                'Nomor Dokumen : SPMI / UIM / SMI / I / A',
                'Tgl : 7 Juni 2026',
                'Rev. : 04',
                'Jumlah Halaman : Halaman 1 dari 21',
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul.',
            ]),
        ]);

        $response->assertCreated();

        $standard = MstStandard::where('name', 'STANDAR VARIASI METADATA')->firstOrFail();
        $this->assertSame('SPMI/UIM/SMI/I/A', $standard->standard_code);
        $this->assertSame('7 Juni 2026', $standard->document_date);
        $this->assertSame(4, $standard->revision_number);
        $this->assertSame(21, $standard->page_count);
        $this->assertNull($standard->iku_count);
        $this->assertNull($standard->ikt_count);
    }

    public function test_document_import_can_be_published_directly_by_authorized_user(): void
    {
        Storage::fake('local');
        $user = $this->actingAsPublishingAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Terbit Langsung',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'initial_status' => 'TERBIT',
            'file' => $this->createDocxUpload('terbit-langsung.docx', [
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul.',
            ]),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'TERBIT');
        $response->assertJsonPath('data.approval_stage', 'FINAL');
        $response->assertJsonPath('data.is_active', true);

        $standard = MstStandard::where('name', 'STANDAR TERBIT LANGSUNG')->firstOrFail();
        $this->assertSame($user->id, $standard->approved_by);
        $this->assertNotNull($standard->rector_approved_at);
    }

    public function test_document_import_defaults_to_published_when_status_is_not_provided(): void
    {
        Storage::fake('local');
        $this->actingAsPublishingAdmin();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Default Terbit',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'file' => $this->createDocxUpload('default-terbit.docx', [
                '1. Visi dan Misi',
                'A. Visi',
                'Menjadi perguruan tinggi unggul.',
            ]),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'TERBIT');
        $response->assertJsonPath('data.approval_stage', 'FINAL');
        $response->assertJsonPath('data.is_active', true);
    }

    public function test_document_import_cannot_be_published_directly_without_publish_permission(): void
    {
        Storage::fake('local');
        $this->actingAsCreateOnlyUser();

        $response = $this->post('/api/v1/standards/import', [
            'name' => 'Standar Terbit Ditolak',
            'category' => 'Tambahan',
            'periode_tahun' => 2026,
            'initial_status' => 'TERBIT',
            'file' => $this->createDocxUpload('terbit-ditolak.docx', ['Dokumen standar']),
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('mst_standards', ['name' => 'STANDAR TERBIT DITOLAK']);
    }
}
