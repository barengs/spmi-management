<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuditDemoSeeder extends Seeder
{
    private int $indicatorSequence = 100;

    public function run(): void
    {
        $lpmUnit = Unit::query()->where('code', 'LPM')->first();
        $departmentUnit = Unit::query()->where('code', 'TIF-S1')->first();
        $departmentUnits = Unit::query()
            ->where('level', 'department')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $leadAuditor = User::updateOrCreate(
            ['email' => 'ratna.kusuma@espmi.dev'],
            [
                'nidn_npk' => 'LAD001',
                'name' => 'Ratna Kusuma',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $leadAuditor->syncRoles(['Lead Auditor']);

        $auditor = User::updateOrCreate(
            ['email' => 'auditor@espmi.dev'],
            [
                'nidn_npk' => 'AUD001',
                'name' => 'Budi Santoso',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $auditor->syncRoles(['Auditor']);

        $auditorTwo = User::updateOrCreate(
            ['email' => 'sari.wulandari@espmi.dev'],
            [
                'nidn_npk' => 'AUD002',
                'name' => 'Sari Wulandari',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $auditorTwo->syncRoles(['Auditor']);

        $auditorThree = User::updateOrCreate(
            ['email' => 'andi.pratama@espmi.dev'],
            [
                'nidn_npk' => 'AUD003',
                'name' => 'Andi Pratama',
                'password' => Hash::make('Password@123'),
                'unit_id' => $lpmUnit?->id,
                'is_active' => true,
            ]
        );
        $auditorThree->syncRoles(['Auditor']);

        $auditee = User::updateOrCreate(
            ['email' => 'auditee@espmi.dev'],
            [
                'nidn_npk' => 'ADT001',
                'name' => 'Koordinator Program Studi TI',
                'password' => Hash::make('Password@123'),
                'unit_id' => $departmentUnit?->id,
                'is_active' => true,
            ]
        );
        $auditee->syncRoles(['Auditee']);

        $auditeePeople = [
            'TIF-S1' => ['email' => 'rina.maharani@espmi.dev', 'nidn_npk' => 'ADT101', 'name' => 'Rina Maharani'],
            'SI-S1' => ['email' => 'dimas.setiawan@espmi.dev', 'nidn_npk' => 'ADT102', 'name' => 'Dimas Setiawan'],
            'TEKOM-S1' => ['email' => 'nabila.ayu@espmi.dev', 'nidn_npk' => 'ADT103', 'name' => 'Nabila Ayu'],
            'BD-S1' => ['email' => 'galih.permana@espmi.dev', 'nidn_npk' => 'ADT104', 'name' => 'Galih Permana'],
            'MNJ-S1' => ['email' => 'maya.lestari@espmi.dev', 'nidn_npk' => 'ADT105', 'name' => 'Maya Lestari'],
            'AKT-S1' => ['email' => 'fajar.hidayat@espmi.dev', 'nidn_npk' => 'ADT106', 'name' => 'Fajar Hidayat'],
            'EKO-S1' => ['email' => 'putri.anindya@espmi.dev', 'nidn_npk' => 'ADT107', 'name' => 'Putri Anindya'],
            'KWB-S1' => ['email' => 'rizky.saputra@espmi.dev', 'nidn_npk' => 'ADT108', 'name' => 'Rizky Saputra'],
            'PGSD-S1' => ['email' => 'anita.safitri@espmi.dev', 'nidn_npk' => 'ADT109', 'name' => 'Anita Safitri'],
            'PBI-S1' => ['email' => 'yusuf.kurniawan@espmi.dev', 'nidn_npk' => 'ADT110', 'name' => 'Yusuf Kurniawan'],
            'PMTK-S1' => ['email' => 'lia.oktaviani@espmi.dev', 'nidn_npk' => 'ADT111', 'name' => 'Lia Oktaviani'],
            'PBIO-S1' => ['email' => 'teguh.wicaksono@espmi.dev', 'nidn_npk' => 'ADT112', 'name' => 'Teguh Wicaksono'],
        ];

        foreach ($departmentUnits as $unit) {
            $profile = $auditeePeople[$unit->code] ?? null;

            if (! $profile) {
                continue;
            }

            $user = User::updateOrCreate(
                ['email' => $profile['email']],
                [
                    'nidn_npk' => $profile['nidn_npk'],
                    'name' => $profile['name'],
                    'password' => Hash::make('Password@123'),
                    'unit_id' => $unit->id,
                    'is_active' => true,
                ]
            );
            $user->syncRoles(['Auditee']);
        }

        $standard = MstStandard::firstOrCreate(
            ['name' => 'Standar Audit Demo Repository Bukti'],
            [
                'category' => 'Institusi',
                'periode_tahun' => (int) date('Y'),
                'is_active' => true,
                'status' => 'DRAFT',
                'referensi_regulasi' => 'Dokumen simulasi untuk pengujian alur audit dan repository bukti.',
            ]
        );

        $indicators = $this->ensureMetricTree($standard);

        $this->seedLinkEvidence(
            metric: $indicators['dokumen_skl'],
            uploader: $auditee,
            title: 'SK Rektor Penetapan SKL 2025',
            notes: 'Dokumen legalisasi standar kompetensi lulusan untuk pengujian audit.',
            linkUrl: 'https://example.com/dokumen/sk-rektor-skl-2025',
            reviewStatus: 'PENDING'
        );

        $this->seedLinkEvidence(
            metric: $indicators['sosialisasi_skl'],
            uploader: $auditee,
            title: 'Berita Acara Sosialisasi SKL',
            notes: 'Masih perlu penambahan daftar hadir lengkap pada lampiran.',
            linkUrl: 'https://example.com/dokumen/berita-acara-sosialisasi-skl',
            reviewStatus: 'REJECTED',
            reviewer: $auditor,
            reviewComment: 'Lampiran daftar hadir dan dokumentasi kegiatan belum lengkap.',
            reviewedAt: now()->subDays(2)
        );

        $this->seedFileEvidence(
            metric: $indicators['monitoring_rps'],
            uploader: $auditee,
            title: 'Laporan Monitoring RPS Semester Ganjil',
            notes: 'Contoh file PDF untuk menguji preview dan unduh dokumen.',
            originalName: 'laporan-monitoring-rps.pdf',
            reviewStatus: 'ACCEPTED',
            reviewer: $auditor,
            reviewComment: 'Dokumen lengkap dan sesuai kebutuhan audit.',
            reviewedAt: now()->subDay()
        );

        $this->seedFileEvidence(
            metric: $indicators['rtl_ami'],
            uploader: $auditee,
            title: 'Rencana Tindak Lanjut AMI',
            notes: 'Dokumen draft tindak lanjut hasil audit internal.',
            originalName: 'rtl-ami-unit-ti.pdf',
            reviewStatus: 'PENDING'
        );

        $this->command->info('Audit demo seed siap: lead auditor, auditor, dan auditee personal per prodi / Password@123');
    }

    /**
     * @return array<string, MstMetric>
     */
    private function ensureMetricTree(MstStandard $standard): array
    {
        $headerOne = $this->firstOrCreateMetric($standard->id, null, 'Kelengkapan Dokumen Mutu', 'Header', 1);
        $statementOne = $this->firstOrCreateMetric($standard->id, $headerOne->id, 'Unit kerja mampu menunjukkan bukti formal atas penetapan dan sosialisasi standar.', 'Statement', 1);

        $headerTwo = $this->firstOrCreateMetric($standard->id, null, 'Tindak Lanjut dan Monitoring', 'Header', 2);
        $statementTwo = $this->firstOrCreateMetric($standard->id, $headerTwo->id, 'Unit kerja mendokumentasikan monitoring implementasi dan tindak lanjut hasil audit.', 'Statement', 1);

        return [
            'dokumen_skl' => $this->firstOrCreateMetric($standard->id, $statementOne->id, 'Tersedia SK penetapan Standar Kompetensi Lulusan yang sah.', 'Indicator', 1),
            'sosialisasi_skl' => $this->firstOrCreateMetric($standard->id, $statementOne->id, 'Tersedia bukti sosialisasi standar kepada dosen dan tenaga kependidikan.', 'Indicator', 2),
            'monitoring_rps' => $this->firstOrCreateMetric($standard->id, $statementTwo->id, 'Tersedia laporan monitoring implementasi RPS dan evaluasi pembelajaran.', 'Indicator', 1),
            'rtl_ami' => $this->firstOrCreateMetric($standard->id, $statementTwo->id, 'Tersedia rencana tindak lanjut atas hasil AMI pada unit kerja.', 'Indicator', 2),
        ];
    }

    private function firstOrCreateMetric(int $standardId, ?int $parentId, string $content, string $type, int $order): MstMetric
    {
        $indicatorCodes = $type === 'Indicator'
            ? $this->generateIndicatorCodes()
            : [null, null];

        $attributes = [
            'type' => $type,
            'order' => $order,
        ];

        if ($type === 'Indicator') {
            $attributes['iku'] = $indicatorCodes[0];
            $attributes['ikt'] = $indicatorCodes[1];
        }

        $metric = MstMetric::firstOrCreate(
            [
                'standard_id' => $standardId,
                'parent_id' => $parentId,
                'content' => $content,
            ],
            $attributes
        );

        if ($type === 'Indicator' && (! filled($metric->iku) && ! filled($metric->ikt))) {
            $metric->forceFill([
                'iku' => $indicatorCodes[0],
                'ikt' => $indicatorCodes[1],
            ])->save();
        }

        return $metric;
    }

    private function generateIndicatorCodes(): array
    {
        $sequence = $this->indicatorSequence++;

        return match ($sequence % 3) {
            1 => [(string) $sequence, null],
            2 => [null, (string) $sequence],
            default => [(string) $sequence, (string) $sequence],
        };
    }

    private function seedLinkEvidence(
        MstMetric $metric,
        User $uploader,
        string $title,
        string $notes,
        string $linkUrl,
        string $reviewStatus,
        ?User $reviewer = null,
        ?string $reviewComment = null,
        $reviewedAt = null
    ): void {
        TrxEvidence::updateOrCreate(
            [
                'metric_id' => $metric->id,
                'title' => $title,
            ],
            [
                'uploaded_by' => $uploader->id,
                'source_type' => 'link',
                'notes' => $notes,
                'link_url' => $linkUrl,
                'file_path' => null,
                'original_name' => null,
                'stored_name' => null,
                'mime_type' => null,
                'size_bytes' => null,
                'review_status' => $reviewStatus,
                'review_comment' => $reviewComment,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => $reviewedAt,
            ]
        );
    }

    private function seedFileEvidence(
        MstMetric $metric,
        User $uploader,
        string $title,
        string $notes,
        string $originalName,
        string $reviewStatus,
        ?User $reviewer = null,
        ?string $reviewComment = null,
        $reviewedAt = null
    ): void {
        $storedName = sprintf('seed-%s-%s', $metric->id, $originalName);
        $path = sprintf('evidences/metric-%s/%s', $metric->id, $storedName);

        if (! Storage::disk('local')->exists($path)) {
            Storage::disk('local')->put($path, $this->minimalPdf($title, $notes));
        }

        TrxEvidence::updateOrCreate(
            [
                'metric_id' => $metric->id,
                'title' => $title,
            ],
            [
                'uploaded_by' => $uploader->id,
                'source_type' => 'file',
                'notes' => $notes,
                'link_url' => null,
                'file_path' => $path,
                'original_name' => $originalName,
                'stored_name' => $storedName,
                'mime_type' => 'application/pdf',
                'size_bytes' => Storage::disk('local')->size($path),
                'review_status' => $reviewStatus,
                'review_comment' => $reviewComment,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => $reviewedAt,
            ]
        );
    }

    private function minimalPdf(string $title, string $notes): string
    {
        $text = substr(preg_replace('/[^\x20-\x7E]/', ' ', $title.' - '.$notes) ?? 'Audit Seed Evidence', 0, 120);

        return "%PDF-1.4\n"
            ."1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
            ."2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
            ."3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
            ."4 0 obj<< /Length 44 >>stream\n"
            ."BT /F1 12 Tf 72 720 Td (".$text.") Tj ET\n"
            ."endstream endobj\n"
            ."5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"
            ."xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000063 00000 n \n0000000122 00000 n \n0000000248 00000 n \n0000000342 00000 n \n"
            ."trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n412\n%%EOF";
    }
}
