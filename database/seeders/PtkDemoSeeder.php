<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Core\Models\Unit;
use App\Modules\Evidence\Models\TrxEvidence;
use App\Modules\Ptk\Models\TrxPtk;
use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Database\Seeder;

class PtkDemoSeeder extends Seeder
{
    public function run(): void
    {
        $auditor = User::query()->where('email', 'auditor@espmi.dev')->first();
        $leadAuditor = User::query()->where('email', 'ratna.kusuma@espmi.dev')->first();
        $auditee = User::query()->where('email', 'auditee@espmi.dev')->first();
        $prodiTi = Unit::query()->where('code', 'TIF-S1')->first();
        $prodiSi = Unit::query()->where('code', 'SI-S1')->first();

        $auditStandard = MstStandard::query()
            ->where('name', 'Standar Audit Demo Repository Bukti')
            ->first();

        if (! $auditStandard || ! $auditor || ! $auditee) {
            $this->command?->warn('PtkDemoSeeder dilewati karena data audit demo belum tersedia.');
            return;
        }

        $indikatorSosialisasi = MstMetric::query()
            ->where('standard_id', $auditStandard->id)
            ->where('content', 'Tersedia bukti sosialisasi standar kepada dosen dan tenaga kependidikan.')
            ->first();

        $indikatorMonitoring = MstMetric::query()
            ->where('standard_id', $auditStandard->id)
            ->where('content', 'Tersedia laporan monitoring implementasi RPS dan evaluasi pembelajaran.')
            ->first();

        $indikatorRtl = MstMetric::query()
            ->where('standard_id', $auditStandard->id)
            ->where('content', 'Tersedia rencana tindak lanjut atas hasil AMI pada unit kerja.')
            ->first();

        $indikatorSkl = MstMetric::query()
            ->where('standard_id', $auditStandard->id)
            ->where('content', 'Tersedia SK penetapan Standar Kompetensi Lulusan yang sah.')
            ->first();

        $evidenceSosialisasi = TrxEvidence::query()
            ->where('metric_id', $indikatorSosialisasi?->id)
            ->where('title', 'Berita Acara Sosialisasi SKL')
            ->first();

        $evidenceMonitoring = TrxEvidence::query()
            ->where('metric_id', $indikatorMonitoring?->id)
            ->where('title', 'Laporan Monitoring RPS Semester Ganjil')
            ->first();

        $evidenceRtl = TrxEvidence::query()
            ->where('metric_id', $indikatorRtl?->id)
            ->where('title', 'Rencana Tindak Lanjut AMI')
            ->first();

        if ($indikatorSosialisasi) {
            TrxPtk::updateOrCreate(
                ['finding_summary' => 'Lampiran daftar hadir dan dokumentasi sosialisasi standar belum lengkap.'],
                [
                    'evidence_id' => $evidenceSosialisasi?->id,
                    'metric_id' => $indikatorSosialisasi->id,
                    'standard_id' => $auditStandard->id,
                    'assigned_user_id' => $auditee->id,
                    'assigned_unit_id' => $auditee->unit_id,
                    'created_by' => $auditor->id,
                    'status' => 'OPEN',
                    'response_note' => null,
                    'responded_at' => null,
                    'responded_by' => null,
                    'verification_note' => null,
                    'verified_at' => null,
                    'verified_by' => null,
                    'closure_note' => null,
                    'closed_at' => null,
                    'closed_by' => null,
                ]
            );
        }

        if ($indikatorMonitoring && $evidenceMonitoring) {
            TrxPtk::updateOrCreate(
                ['finding_summary' => 'Monitoring RPS sudah ada, tetapi ringkasan tindak lanjut evaluasi pembelajaran belum dijelaskan rinci.'],
                [
                    'evidence_id' => $evidenceMonitoring->id,
                    'metric_id' => $indikatorMonitoring->id,
                    'standard_id' => $auditStandard->id,
                    'assigned_user_id' => $auditee->id,
                    'assigned_unit_id' => $auditee->unit_id,
                    'created_by' => $leadAuditor?->id ?? $auditor->id,
                    'status' => 'RESPONDED',
                    'response_note' => 'Program studi sudah menambahkan ringkasan evaluasi pembelajaran, notulen rapat, dan rencana tindak lanjut untuk semester berikutnya.',
                    'responded_at' => now()->subDays(2),
                    'responded_by' => $auditee->id,
                    'verification_note' => null,
                    'verified_at' => null,
                    'verified_by' => null,
                    'closure_note' => null,
                    'closed_at' => null,
                    'closed_by' => null,
                ]
            );
        }

        if ($indikatorRtl && $evidenceRtl) {
            TrxPtk::updateOrCreate(
                ['finding_summary' => 'Dokumen RTL AMI sudah tersedia, namun auditor meminta penajaman PIC dan target waktu implementasi.'],
                [
                    'evidence_id' => $evidenceRtl->id,
                    'metric_id' => $indikatorRtl->id,
                    'standard_id' => $auditStandard->id,
                    'assigned_user_id' => $auditee->id,
                    'assigned_unit_id' => $auditee->unit_id,
                    'created_by' => $auditor->id,
                    'status' => 'REVISION_REQUIRED',
                    'response_note' => 'Draft awal sudah dilengkapi, tetapi masih menunggu penetapan PIC per kegiatan.',
                    'responded_at' => now()->subDays(5),
                    'responded_by' => $auditee->id,
                    'verification_note' => 'Mohon tambahkan penanggung jawab dan target waktu implementasi yang lebih operasional.',
                    'verified_at' => now()->subDays(4),
                    'verified_by' => $auditor->id,
                    'closure_note' => null,
                    'closed_at' => null,
                    'closed_by' => null,
                ]
            );
        }

        if ($indikatorSkl) {
            TrxPtk::updateOrCreate(
                ['finding_summary' => 'SK penetapan SKL untuk Program Studi Sistem Informasi belum diunggah pada repository audit.'],
                [
                    'evidence_id' => null,
                    'metric_id' => $indikatorSkl->id,
                    'standard_id' => $auditStandard->id,
                    'assigned_user_id' => null,
                    'assigned_unit_id' => $prodiSi?->id ?? $auditee->unit_id,
                    'created_by' => $leadAuditor?->id ?? $auditor->id,
                    'status' => 'VERIFIED',
                    'response_note' => 'Unit sudah menyerahkan SK penetapan SKL yang ditandatangani pimpinan dan mengunggahnya ke repository.',
                    'responded_at' => now()->subDays(9),
                    'responded_by' => $auditee->id,
                    'verification_note' => 'Dokumen pengganti sudah valid dan sesuai kebutuhan audit.',
                    'verified_at' => now()->subDays(8),
                    'verified_by' => $leadAuditor?->id ?? $auditor->id,
                    'closure_note' => null,
                    'closed_at' => null,
                    'closed_by' => null,
                ]
            );
        }

        if ($indikatorMonitoring) {
            TrxPtk::updateOrCreate(
                ['finding_summary' => 'Program Studi TI belum menyertakan rekap tindak lanjut hasil monitoring pembelajaran pada semester lalu.'],
                [
                    'evidence_id' => null,
                    'metric_id' => $indikatorMonitoring->id,
                    'standard_id' => $auditStandard->id,
                    'assigned_user_id' => $auditee->id,
                    'assigned_unit_id' => $prodiTi?->id ?? $auditee->unit_id,
                    'created_by' => $auditor->id,
                    'status' => 'CLOSED',
                    'response_note' => 'Rekap tindak lanjut dan bukti rapat evaluasi sudah dilengkapi pada arsip semester genap.',
                    'responded_at' => now()->subDays(15),
                    'responded_by' => $auditee->id,
                    'verification_note' => 'Tindak lanjut lengkap dan konsisten dengan catatan audit.',
                    'verified_at' => now()->subDays(14),
                    'verified_by' => $auditor->id,
                    'closure_note' => 'PTK ditutup karena seluruh bukti perbaikan telah diverifikasi.',
                    'closed_at' => now()->subDays(13),
                    'closed_by' => $leadAuditor?->id ?? $auditor->id,
                ]
            );
        }

        $this->command?->info('Seeder PTK demo siap dengan status OPEN, RESPONDED, REVISION_REQUIRED, VERIFIED, dan CLOSED.');
    }
}
