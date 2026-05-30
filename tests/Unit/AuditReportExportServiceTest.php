<?php

namespace Tests\Unit;

use App\Models\User;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Audit\Services\AuditReportExportService;
use App\Modules\Core\Models\Unit;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use ZipArchive;
use Tests\TestCase;

class AuditReportExportServiceTest extends TestCase
{
    public function test_save_docx_escapes_xml_special_characters_in_generated_document(): void
    {
        $service = app(AuditReportExportService::class);

        $schedule = new AuditSchedule();
        $schedule->location = 'Kampus A & Kampus B';
        $schedule->scheduled_start = Carbon::parse('2026-05-30');
        $schedule->audit_period_conclusion = "Kesimpulan A\nKesimpulan B";

        $standard = new MstStandard();
        $standard->name = 'Standar Pendidikan & Pengajaran';
        $standard->periode_tahun = 2025;

        $faculty = new Unit();
        $faculty->name = 'Fakultas Teknik';

        $prodi = new Unit();
        $prodi->name = 'S1 Informatika';

        $leadAuditor = new User();
        $leadAuditor->name = 'Lead Auditor';

        $auditor = new User();
        $auditor->name = 'Anggota Auditor';

        $auditee = new User();
        $auditee->name = 'Auditee User';

        $schedule->setRelation('standard', $standard);
        $schedule->setRelation('faculty', $faculty);
        $schedule->setRelation('prodi', $prodi);
        $schedule->setRelation('leadAuditor', $leadAuditor);
        $schedule->setRelation('auditor', $auditor);
        $schedule->setRelation('auditee', $auditee);

        $docxPath = $service->saveDocx($schedule, collect());

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($docxPath) === true);

        $documentXml = $zip->getFromName('word/document.xml');
        $zip->close();

        $this->assertIsString($documentXml);
        $this->assertStringContainsString('Pembukaan &amp; Pertemuan dengan Auditee', $documentXml);
        $this->assertStringNotContainsString('Pembukaan & Pertemuan dengan Auditee', $documentXml);

        $xml = simplexml_load_string($documentXml);
        $this->assertNotFalse($xml);

        @unlink($docxPath);
    }

    public function test_save_docx_keeps_document_valid_when_signature_is_webp(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD WebP support is not available.');
        }

        Storage::fake('local');

        $service = app(AuditReportExportService::class);

        $schedule = new AuditSchedule();
        $schedule->location = 'Lokasi audit';
        $schedule->scheduled_start = Carbon::parse('2026-05-30');

        $standard = new MstStandard();
        $standard->name = 'Standar Audit';
        $standard->periode_tahun = 2025;

        $faculty = new Unit();
        $faculty->name = 'Fakultas Teknik';

        $prodi = new Unit();
        $prodi->name = 'S1 Informatika';

        $leadAuditor = new User();
        $leadAuditor->name = 'Lead Auditor';
        $leadAuditor->signature_path = $this->createWebpSignature();

        $auditor = new User();
        $auditor->name = 'Anggota Auditor';

        $auditee = new User();
        $auditee->name = 'Auditee User';

        $schedule->setRelation('standard', $standard);
        $schedule->setRelation('faculty', $faculty);
        $schedule->setRelation('prodi', $prodi);
        $schedule->setRelation('leadAuditor', $leadAuditor);
        $schedule->setRelation('auditor', $auditor);
        $schedule->setRelation('auditee', $auditee);

        $docxPath = $service->saveDocx($schedule, collect());

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($docxPath) === true);

        $documentXml = $zip->getFromName('word/document.xml');
        $mediaFiles = array_filter($zip->namelist(), static fn (string $name) => str_starts_with($name, 'word/media/'));
        $zip->close();

        $this->assertIsString($documentXml);
        $this->assertNotFalse(simplexml_load_string($documentXml));
        $this->assertNotEmpty($mediaFiles);

        @unlink($docxPath);
    }

    private function createWebpSignature(): string
    {
        $image = imagecreatetruecolor(140, 50);
        $background = imagecolorallocatealpha($image, 255, 255, 255, 127);
        imagefill($image, 0, 0, $background);
        imagesavealpha($image, true);

        $ink = imagecolorallocate($image, 20, 20, 20);
        imageline($image, 10, 35, 60, 12, $ink);
        imageline($image, 60, 12, 110, 30, $ink);
        imageline($image, 110, 30, 130, 18, $ink);

        $tmpFile = tempnam(sys_get_temp_dir(), 'sig_');
        $webpPath = $tmpFile . '.webp';
        @unlink($tmpFile);

        imagewebp($image, $webpPath);
        imagedestroy($image);

        $storedPath = 'signatures/test-signature.webp';
        Storage::disk('local')->put($storedPath, file_get_contents($webpPath));
        @unlink($webpPath);

        return $storedPath;
    }
}
