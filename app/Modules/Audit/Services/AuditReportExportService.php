<?php

namespace App\Modules\Audit\Services;

use App\Models\User;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Ptk\Models\TrxPtk;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Shared\Converter;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\Cell;
use PhpOffice\PhpWord\Style\Image;

class AuditReportExportService
{
    public function buildWordHtml(AuditSchedule $schedule, Collection $findings): string
    {
        $context = $this->buildContext($schedule, $findings);
        $findingRows = $this->buildHtmlFindingRows($context['findings'], $context['auditor_initials']);
        $conclusionItems = collect($context['conclusions'])
            ->map(fn (string $line) => '<li>' . e($line) . '</li>')
            ->implode('');

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan AMI - {$this->escape($context['faculty_name'])}</title>
    <style>
        @page { margin: 1.5cm 1.35cm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11pt; line-height: 1.35; }
        .cover { min-height: 980px; }
        .center { text-align: center; }
        .cover-logo { display: block; margin: 36px auto 18px; width: 120px; height: auto; }
        .cover-title { color: #365f91; font-size: 30pt; font-weight: bold; margin: 0 0 8px; }
        .cover-subtitle { color: #365f91; font-size: 24pt; font-weight: bold; margin: 0 0 6px; }
        .cover-unit { color: #365f91; font-size: 22pt; font-weight: bold; margin: 0 0 32px; }
        .cover-rule { width: 430px; height: 2px; margin: 0 auto 20px; background: #7fb3d5; }
        .meta-list { width: 430px; margin: 0 auto; border-collapse: collapse; }
        .meta-list td { padding: 6px 8px; font-size: 16pt; font-weight: bold; }
        .meta-list .label { width: 220px; }
        .meta-list .colon { width: 18px; text-align: center; }
        .page-break { page-break-before: always; }
        .page-title { text-align: center; font-size: 12pt; font-weight: bold; line-height: 1.15; margin-bottom: 14px; text-transform: uppercase; }
        .section-title { font-size: 12pt; font-weight: bold; margin: 18px 0 6px; text-transform: uppercase; }
        .body-table, .schedule-table, .finding-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
        .body-table td, .schedule-table td, .schedule-table th, .finding-table td, .finding-table th { border: 1px solid #111827; padding: 4px 6px; vertical-align: top; }
        .body-table td.label { width: 120px; font-weight: bold; }
        .body-table td.colon { width: 22px; text-align: center; }
        .body-table td.value { width: 210px; }
        .schedule-table th, .finding-table th { font-weight: bold; text-align: center; }
        .signature-cell { height: 58px; text-align: center; }
        .signature-image { max-width: 120px; max-height: 48px; width: auto; height: auto; }
        .goal-list { margin: 4px 0 0 22px; padding: 0; }
        .goal-list li { margin: 2px 0; }
        .conclusion-list { margin: 6px 0 0 18px; padding: 0; }
        .conclusion-list li { margin: 3px 0; }
    </style>
</head>
<body>
    <div class="cover">
        <div class="center">
            {$this->buildHtmlLogoMarkup($context['logo_path'])}
            <div class="cover-title">LAPORAN</div>
            <div class="cover-subtitle">Audit Mutu Internal (AMI)</div>
            <div class="cover-unit">{$this->escape($context['cover_unit_label'])}</div>
        </div>
        <div class="cover-rule"></div>
        <table class="meta-list">
            {$this->buildHtmlCoverMetaRows($context)}
        </table>
    </div>

    <div class="page-break"></div>

    <div class="page-title">
        LAPORAN AUDIT MUTU INTERNAL<br />
        {$this->escape(Str::upper($context['cover_unit_label']))}
    </div>

    <div class="section-title">I. PENDAHULUAN</div>
    {$this->buildHtmlPendahuluanTable($context)}

    <div class="section-title">II. TUJUAN AUDIT:</div>
    <ol class="goal-list" type="a">
        <li>Memastikan bahwa implementasi standar dikti telah sesuai dengan standar yang telah ditetapkan.</li>
        <li>Memetakan kesiapan {$this->escape(Str::lower($context['cover_unit_label']))} dalam melaksanakan program akreditasi.</li>
        <li>Memastikan kelancaran pelaksanaan pengelolaan {$this->escape(Str::lower($context['cover_unit_label']))}.</li>
        <li>Memetakan peluang peningkatan mutu {$this->escape(Str::lower($context['cover_unit_label']))}.</li>
    </ol>

    <div class="section-title">III. LINGKUP AUDIT:</div>
    <div>{$this->escape($context['scope_label'])}</div>

    <div class="section-title">IV. JADWAL AUDIT:</div>
    <div>Hari/Tanggal audit : {$this->escape($context['audit_date'])}</div>
    {$this->buildHtmlScheduleTable($context['audit_date'])}

    <div class="section-title">V. TEMUAN AUDIT:</div>
    <table class="finding-table">
        <thead>
            <tr>
                <th style="width: 34px;">No.</th>
                <th style="width: 84px;">KTS/OB<br />(Initial Auditor)</th>
                <th style="width: 150px;">Referensi<br />(butir mutu)</th>
                <th>Pernyataan</th>
            </tr>
        </thead>
        <tbody>
            {$findingRows}
        </tbody>
    </table>

    <div class="section-title">VI. KESIMPULAN AUDIT</div>
    <ul class="conclusion-list">
        {$conclusionItems}
    </ul>
</body>
</html>
HTML;
    }

    public function buildPhpWord(AuditSchedule $schedule, Collection $findings): PhpWord
    {
        $context = $this->buildContext($schedule, $findings);
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(11);

        $this->registerStyles($phpWord);

        $section = $phpWord->addSection([
            'marginTop' => 1418,
            'marginRight' => 1275,
            'marginBottom' => 1276,
            'marginLeft' => 1418,
        ]);

        $this->buildCoverPage($section, $context);
        $section->addPageBreak();
        $this->buildContentPages($section, $context);

        return $phpWord;
    }

    private function registerStyles(PhpWord $phpWord): void
    {
        $phpWord->addParagraphStyle('coverCenter', [
            'alignment' => Jc::CENTER,
            'spaceAfter' => 0,
            'spaceBefore' => 0,
        ]);
        $phpWord->addParagraphStyle('centerTight', [
            'alignment' => Jc::CENTER,
            'spaceAfter' => 0,
            'spaceBefore' => 0,
            'lineHeight' => 1.0,
        ]);
        $phpWord->addParagraphStyle('sectionHeading', [
            'spaceBefore' => 160,
            'spaceAfter' => 40,
        ]);
        $phpWord->addParagraphStyle('bodyTight', [
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
        ]);
        $phpWord->addParagraphStyle('italicBullet', [
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
            'indentation' => ['left' => 480, 'hanging' => 220],
        ]);
    }

    private function buildCoverPage($section, array $context): void
    {
        $section->addTextBreak(2);

        if ($context['logo_path']) {
            $section->addImage($context['logo_path'], [
                'width' => 110,
                'height' => 110,
                'alignment' => Jc::CENTER,
                'wrappingStyle' => Image::WRAPPING_STYLE_INLINE,
            ]);
        } else {
            $section->addText('UNIVERSITAS ISLAM MADURA', ['bold' => true, 'size' => 14], 'coverCenter');
        }

        $section->addTextBreak();
        $section->addText('LAPORAN', ['bold' => true, 'size' => 28, 'color' => '365F91'], 'coverCenter');
        $section->addText('Audit Mutu Internal (AMI)', ['bold' => true, 'size' => 24, 'color' => '365F91'], 'coverCenter');
        $section->addText($context['cover_unit_label'], ['bold' => true, 'size' => 22, 'color' => '365F91'], 'coverCenter');
        $section->addTextBreak();

        $lineTable = $section->addTable([
            'alignment' => Jc::CENTER,
            'cellMargin' => 0,
            'borderSize' => 0,
        ]);
        $lineTable->addRow();
        $lineTable->addCell(Converter::cmToTwip(11), [
            'borderBottomSize' => 12,
            'borderBottomColor' => '7FB3D5',
        ])->addText('');

        $section->addTextBreak();

        $metaTable = $section->addTable([
            'alignment' => Jc::CENTER,
            'cellMarginTop' => 40,
            'cellMarginBottom' => 40,
            'cellMarginLeft' => 60,
            'cellMarginRight' => 60,
            'borderSize' => 0,
        ]);

        foreach ($this->buildCoverMetaRows($context) as $row) {
            $metaTable->addRow();
            $metaTable->addCell(Converter::cmToTwip(5.5), ['borderSize' => 0])
                ->addText($row['label'], ['bold' => true, 'size' => 16], 'bodyTight');
            $metaTable->addCell(Converter::cmToTwip(0.6), ['borderSize' => 0])
                ->addText(':', ['bold' => true, 'size' => 16], 'centerTight');
            $metaTable->addCell(Converter::cmToTwip(6.2), ['borderSize' => 0])
                ->addText($row['value'], ['bold' => true, 'size' => 16], 'bodyTight');
        }
    }

    private function buildContentPages($section, array $context): void
    {
        $section->addText(
            'LAPORAN AUDIT MUTU INTERNAL',
            ['bold' => true, 'size' => 12],
            'centerTight'
        );
        $section->addText(
            Str::upper($context['cover_unit_label']),
            ['bold' => true, 'size' => 12],
            'centerTight'
        );
        $section->addTextBreak();

        $section->addText('I.    PENDAHULUAN', ['bold' => true, 'size' => 12], 'sectionHeading');
        $this->buildPendahuluanTable($section, $context);

        $section->addText('II.   TUJUAN AUDIT:', ['bold' => true, 'size' => 12], 'sectionHeading');
        foreach ($this->buildGoalItems($context) as $goal) {
            $section->addListItem($goal, 0, ['italic' => true, 'size' => 11], null, [
                'listType' => \PhpOffice\PhpWord\Style\ListItem::TYPE_ALPHA_LOWER,
            ]);
        }

        $section->addText('III.  LINGKUP AUDIT:', ['bold' => true, 'size' => 12], 'sectionHeading');
        $section->addText($context['scope_label'], ['size' => 11], 'bodyTight');

        $section->addText('IV.  JADWAL AUDIT:', ['bold' => true, 'size' => 12], 'sectionHeading');
        $section->addText('Hari/Tanggal audit : ' . $context['audit_date'], ['size' => 11], 'bodyTight');
        $this->buildScheduleTable($section);

        $section->addText('V.   TEMUAN AUDIT:', ['bold' => true, 'size' => 12], 'sectionHeading');
        $this->buildFindingsTable($section, $context);

        $section->addText('VI.  KESIMPULAN AUDIT', ['bold' => true, 'size' => 12], 'sectionHeading');
        foreach ($context['conclusions'] as $line) {
            $section->addListItem($line, 0, ['italic' => true, 'size' => 11]);
        }
    }

    private function buildPendahuluanTable($section, array $context): void
    {
        $table = $section->addTable([
            'alignment' => Jc::CENTER,
            'borderSize' => 6,
            'borderColor' => '111111',
            'cellMarginTop' => 30,
            'cellMarginBottom' => 30,
            'cellMarginLeft' => 50,
            'cellMarginRight' => 50,
        ]);

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Fakultas', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(8.6), ['gridSpan' => 3])->addText($context['faculty_name'], ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Program Studi', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(8.6), ['gridSpan' => 3])->addText($context['prodi_name'], ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Alamat', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(8.6), ['gridSpan' => 3])->addText($context['location'], ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Nama Auditee', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(4.6))->addText($context['auditee_name'], ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(1.1))->addText('Telp. :', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(2.9))->addText('-', ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Tanggal Audit', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(8.6), ['gridSpan' => 3])->addText($context['audit_date'], ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Ketua Auditor', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(4.6))->addText($context['lead_auditor'], ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(1.1))->addText($context['cover_unit_label'] . ' :', ['size' => 10.5], 'bodyTight');
        $table->addCell(Converter::cmToTwip(2.9))->addText($context['faculty_short_name'], ['size' => 10.5], 'bodyTight');

        $table->addRow();
        $table->addCell(Converter::cmToTwip(2.7))->addText('Anggota Auditor', ['size' => 10.5], 'bodyTight');
        $anggotaCell = $table->addCell(Converter::cmToTwip(8.6), ['gridSpan' => 3]);
        $anggotaCell->addText('Nama   : ' . $context['auditor'], ['size' => 10.5], 'bodyTight');
        $anggotaCell->addText($context['cover_unit_label'] . ' : ' . $context['faculty_short_name'], ['size' => 10.5], 'bodyTight');
        $anggotaCell->addText('Telp.  : -', ['size' => 10.5], 'bodyTight');

        $table->addRow(Converter::cmToTwip(1.4));
        $table->addCell(Converter::cmToTwip(2.7))->addText('Tanda Tangan' . "\n" . 'Ketua Auditor', ['size' => 10.5], 'bodyTight');
        $leadSigCell = $table->addCell(Converter::cmToTwip(3.9), ['vMerge' => 'restart', 'valign' => Cell::VALIGN_CENTER]);
        $this->appendSignatureToCell($leadSigCell, $context['lead_signature_path']);
        $table->addCell(Converter::cmToTwip(2.0))->addText('Tanda Tangan' . "\n" . $context['auditee_label'], ['size' => 10.5], 'bodyTight');
        $auditeeSigCell = $table->addCell(Converter::cmToTwip(2.7), ['vMerge' => 'restart', 'valign' => Cell::VALIGN_CENTER]);
        $this->appendSignatureToCell($auditeeSigCell, $context['auditee_signature_path']);
    }

    private function buildScheduleTable($section): void
    {
        $rows = [
            ['1', '09.00 - 12.15', 'Pembukaan & Pertemuan dengan Auditee'],
            ['2', '', 'Pertemuan dengan Staf Dosen'],
            ['3', '', 'Pertemuan dengan Karyawan'],
            ['4', '', 'Pertemuan dengan Mahasiswa'],
            ['5', '', 'Pertemuan dengan alumni/pengguna lulusan (jika ada)'],
            ['6', '12.15 - 12.30', 'Penyampaian Temuan & Penutupan'],
        ];

        $table = $section->addTable([
            'alignment' => Jc::CENTER,
            'borderSize' => 6,
            'borderColor' => '111111',
            'cellMarginTop' => 20,
            'cellMarginBottom' => 20,
            'cellMarginLeft' => 45,
            'cellMarginRight' => 45,
        ]);

        $table->addRow();
        $table->addCell(Converter::cmToTwip(0.8))->addText('No', ['bold' => true, 'size' => 10.5], 'centerTight');
        $table->addCell(Converter::cmToTwip(2.8))->addText('Jam', ['bold' => true, 'size' => 10.5], 'centerTight');
        $table->addCell(Converter::cmToTwip(7.4))->addText('Kegiatan Audit', ['bold' => true, 'size' => 10.5], 'centerTight');

        foreach ($rows as $row) {
            $table->addRow();
            $table->addCell(Converter::cmToTwip(0.8))->addText($row[0], ['size' => 10.5], 'centerTight');
            $table->addCell(Converter::cmToTwip(2.8))->addText($row[1], ['size' => 10.5], 'bodyTight');
            $table->addCell(Converter::cmToTwip(7.4))->addText($row[2], ['italic' => true, 'size' => 10.5], 'bodyTight');
        }
    }

    private function buildFindingsTable($section, array $context): void
    {
        $table = $section->addTable([
            'alignment' => Jc::CENTER,
            'borderSize' => 6,
            'borderColor' => '111111',
            'cellMarginTop' => 25,
            'cellMarginBottom' => 25,
            'cellMarginLeft' => 40,
            'cellMarginRight' => 40,
        ]);

        $table->addRow();
        $table->addCell(Converter::cmToTwip(0.8))->addText('No.', ['bold' => true, 'size' => 10], 'centerTight');
        $table->addCell(Converter::cmToTwip(1.6))->addText('KTS/OB' . "\n" . '(Initial Auditor)', ['bold' => true, 'size' => 10], 'centerTight');
        $table->addCell(Converter::cmToTwip(3.3))->addText('Referensi' . "\n" . '(butir mutu)', ['bold' => true, 'size' => 10], 'centerTight');
        $table->addCell(Converter::cmToTwip(5.8))->addText('Pernyataan', ['bold' => true, 'size' => 10], 'centerTight');

        if ($context['findings']->isEmpty()) {
            $table->addRow();
            $table->addCell(Converter::cmToTwip(11.5), ['gridSpan' => 4])->addText('Tidak ada temuan audit.', ['size' => 10.5], 'centerTight');

            return;
        }

        foreach ($context['findings']->values() as $index => $ptk) {
            $table->addRow();
            $table->addCell(Converter::cmToTwip(0.8))->addText((string) ($index + 1), ['size' => 10.5], 'centerTight');
            $table->addCell(Converter::cmToTwip(1.6))->addText($context['auditor_initials'], ['size' => 10.5], 'centerTight');
            $table->addCell(Converter::cmToTwip(3.3))->addText($this->buildFindingReference($ptk), ['size' => 10.5], 'centerTight');
            $table->addCell(Converter::cmToTwip(5.8))->addText($ptk->finding_summary ?: '-', ['size' => 10.5], 'bodyTight');
        }
    }

    private function appendSignatureToCell($cell, ?string $path): void
    {
        if ($path && is_file($path)) {
            $cell->addImage($path, [
                'width' => 110,
                'height' => 45,
                'alignment' => Jc::CENTER,
                'wrappingStyle' => Image::WRAPPING_STYLE_INLINE,
            ]);
        } else {
            $cell->addText('', ['size' => 10], 'centerTight');
            $cell->addText('', ['size' => 10], 'centerTight');
        }
    }

    private function buildContext(AuditSchedule $schedule, Collection $findings): array
    {
        $facultyName = $schedule->faculty?->name ?: '-';
        $prodiName = $schedule->prodi?->name ?: '-';
        $coverUnitLabel = $schedule->prodi ? 'Program Studi' : 'Fakultas';
        $academicYear = $this->formatAcademicYear($schedule->standard?->periode_tahun);

        return [
            'faculty_name' => $facultyName,
            'faculty_short_name' => $this->shortenFacultyName($facultyName),
            'prodi_name' => $prodiName,
            'auditee_name' => $schedule->auditee?->name ?: '-',
            'lead_auditor' => $schedule->leadAuditor?->name ?: '-',
            'auditor' => $schedule->auditor?->name ?: '-',
            'academic_year' => $academicYear,
            'audit_date' => $this->formatDate($schedule->scheduled_start),
            'location' => $schedule->location ?: 'Jl. Ponpes Miftahul Ulum Bettet Pamekasan',
            'cover_unit_label' => $coverUnitLabel,
            'auditee_label' => $schedule->prodi ? 'Auditee' : 'Dekan',
            'scope_label' => $schedule->standard?->name
                ? sprintf('%s tahun akademik %s', $schedule->standard->name, $academicYear)
                : sprintf('Standar Pendidikan tahun akademik %s', $academicYear),
            'conclusions' => $this->buildConclusions($schedule, $findings),
            'findings' => $findings,
            'auditor_initials' => $this->buildAuditorInitials($schedule),
            'logo_path' => $this->resolveLogoPath(),
            'lead_signature_path' => $this->resolveUserSignaturePath($schedule->leadAuditor),
            'auditee_signature_path' => $this->resolveUserSignaturePath($schedule->auditee),
        ];
    }

    private function buildGoalItems(array $context): array
    {
        $unit = Str::lower($context['cover_unit_label']);

        return [
            'Memastikan bahwa implementasi standar dikti telah sesuai dengan standar yang telah ditetapkan.',
            'Memetakan kesiapan ' . $unit . ' dalam melaksanakan program Akreditasi.',
            'Memastikan kelancaran pelaksanaan pengelolaan ' . $unit . '.',
            'Memetakan peluang peningkatan mutu ' . $unit . '.',
        ];
    }

    private function buildCoverMetaRows(array $context): array
    {
        return [
            ['label' => 'Jenjang', 'value' => $this->inferLevelFromName($context['prodi_name'])],
            ['label' => 'Fakultas', 'value' => $context['faculty_short_name']],
            ['label' => $context['prodi_name'] !== '-' ? 'Program Studi' : 'Auditee', 'value' => $context['prodi_name'] !== '-' ? $context['prodi_name'] : $context['auditee_name']],
            ['label' => 'Ketua Tim Auditor', 'value' => $context['lead_auditor']],
            ['label' => 'Anggota', 'value' => $context['auditor']],
            ['label' => 'Tahun Akademik', 'value' => $context['academic_year']],
        ];
    }

    private function buildHtmlCoverMetaRows(array $context): string
    {
        return collect($this->buildCoverMetaRows($context))
            ->map(fn (array $row) => sprintf(
                '<tr><td class="label">%s</td><td class="colon">:</td><td>%s</td></tr>',
                e($row['label']),
                e($row['value'])
            ))
            ->implode('');
    }

    private function buildHtmlPendahuluanTable(array $context): string
    {
        $leadSig = $this->buildHtmlSignatureMarkup($context['lead_signature_path']);
        $auditeeSig = $this->buildHtmlSignatureMarkup($context['auditee_signature_path']);

        return <<<HTML
<table class="body-table">
    <tr>
        <td class="label">Fakultas</td>
        <td colspan="3">{$this->escape($context['faculty_name'])}</td>
    </tr>
    <tr>
        <td class="label">Program Studi</td>
        <td colspan="3">{$this->escape($context['prodi_name'])}</td>
    </tr>
    <tr>
        <td class="label">Alamat</td>
        <td colspan="3">{$this->escape($context['location'])}</td>
    </tr>
    <tr>
        <td class="label">Nama Auditee</td>
        <td>{$this->escape($context['auditee_name'])}</td>
        <td style="width:90px;">Telp. :</td>
        <td>-</td>
    </tr>
    <tr>
        <td class="label">Tanggal Audit</td>
        <td colspan="3">{$this->escape($context['audit_date'])}</td>
    </tr>
    <tr>
        <td class="label">Ketua Auditor</td>
        <td>{$this->escape($context['lead_auditor'])}</td>
        <td>{$this->escape($context['cover_unit_label'])} :</td>
        <td>{$this->escape($context['faculty_short_name'])}</td>
    </tr>
    <tr>
        <td class="label">Anggota Auditor</td>
        <td colspan="3">
            Nama : {$this->escape($context['auditor'])}<br />
            {$this->escape($context['cover_unit_label'])} : {$this->escape($context['faculty_short_name'])}<br />
            Telp. : -
        </td>
    </tr>
    <tr>
        <td class="label">Tanda Tangan<br />Ketua Auditor</td>
        <td class="signature-cell">{$leadSig}</td>
        <td>Tanda Tangan<br />{$this->escape($context['auditee_label'])}</td>
        <td class="signature-cell">{$auditeeSig}</td>
    </tr>
</table>
HTML;
    }

    private function buildHtmlScheduleTable(string $auditDate): string
    {
        $rows = [
            ['1', '09.00 - 12.15', 'Pembukaan & Pertemuan dengan Auditee'],
            ['2', '', 'Pertemuan dengan Staf Dosen'],
            ['3', '', 'Pertemuan dengan Karyawan'],
            ['4', '', 'Pertemuan dengan Mahasiswa'],
            ['5', '', 'Pertemuan dengan alumni/pengguna lulusan (jika ada)'],
            ['6', '12.15 - 12.30', 'Penyampaian Temuan & Penutupan'],
        ];

        $htmlRows = collect($rows)->map(fn (array $row) => sprintf(
            '<tr><td class="center">%s</td><td>%s</td><td><em>%s</em></td></tr>',
            e($row[0]),
            e($row[1]),
            e($row[2])
        ))->implode('');

        return <<<HTML
<table class="schedule-table">
    <thead>
        <tr>
            <th style="width: 34px;">No</th>
            <th style="width: 120px;">Jam</th>
            <th>Kegiatan Audit</th>
        </tr>
    </thead>
    <tbody>
        {$htmlRows}
    </tbody>
</table>
HTML;
    }

    private function buildHtmlFindingRows(Collection $findings, string $auditorInitials): string
    {
        $rows = $findings->values()->map(fn (TrxPtk $ptk, int $index) => sprintf(
            '<tr><td class="center">%s</td><td class="center">%s</td><td class="center">%s</td><td>%s</td></tr>',
            $index + 1,
            e($auditorInitials),
            e($this->buildFindingReference($ptk)),
            e($ptk->finding_summary ?: '-')
        ))->implode('');

        if ($rows !== '') {
            return $rows;
        }

        return '<tr><td colspan="4" class="center">Tidak ada temuan audit.</td></tr>';
    }

    private function buildHtmlLogoMarkup(?string $logoPath): string
    {
        if (! $logoPath || ! is_file($logoPath)) {
            return '';
        }

        return '<img class="cover-logo" src="' . e($this->toDataUri($logoPath, 'image/png')) . '" alt="Logo Universitas Islam Madura" />';
    }

    private function buildHtmlSignatureMarkup(?string $signaturePath): string
    {
        if (! $signaturePath || ! is_file($signaturePath)) {
            return '';
        }

        $mimeType = mime_content_type($signaturePath) ?: 'image/png';

        return '<img class="signature-image" src="' . e($this->toDataUri($signaturePath, $mimeType)) . '" alt="Tanda Tangan" />';
    }

    private function resolveLogoPath(): ?string
    {
        $publicLogo = public_path('uim-report-logo.png');

        return is_file($publicLogo) ? $publicLogo : null;
    }

    private function resolveUserSignaturePath(?User $user): ?string
    {
        if (! $user?->signature_path) {
            return null;
        }

        if (! Storage::disk('local')->exists($user->signature_path)) {
            return null;
        }

        return Storage::disk('local')->path($user->signature_path);
    }

    private function toDataUri(string $path, string $mimeType): string
    {
        return 'data:' . $mimeType . ';base64,' . base64_encode((string) file_get_contents($path));
    }

    private function buildAuditorInitials(AuditSchedule $schedule): string
    {
        $names = array_filter([
            $schedule->leadAuditor?->name,
            $schedule->auditor?->name,
        ]);

        if (empty($names)) {
            return 'KTS';
        }

        return collect($names)
            ->map(function (?string $name) {
                return collect(preg_split('/\s+/u', trim((string) $name)) ?: [])
                    ->filter()
                    ->take(2)
                    ->map(fn (string $part) => Str::upper(Str::substr($part, 0, 1)))
                    ->implode('');
            })
            ->filter()
            ->implode(', ');
    }

    private function buildFindingReference(TrxPtk $ptk): string
    {
        if ($ptk->metric?->content) {
            return Str::limit($ptk->metric->content, 60);
        }

        if ($ptk->standard?->name) {
            return Str::limit($ptk->standard->name, 60);
        }

        return '-';
    }

    private function buildConclusions(AuditSchedule $schedule, Collection $findings): array
    {
        if ($schedule->audit_period_conclusion) {
            $lines = array_values(array_filter(array_map('trim', preg_split('/\R/u', $schedule->audit_period_conclusion) ?: [])));

            if ($lines !== []) {
                return $lines;
            }
        }

        $unitName = $schedule->faculty?->name ?: $schedule->prodi?->name ?: 'unit audit';

        return [
            sprintf('Kelengkapan dokumen standar tahun akademik %s %s telah ditelaah.', $this->formatAcademicYear($schedule->standard?->periode_tahun), $unitName),
            sprintf('Jumlah temuan %d.', $findings->count()),
            sprintf('%s diharapkan menindaklanjuti hasil audit secara berkelanjutan.', $unitName),
        ];
    }

    private function formatAcademicYear($year): string
    {
        if (! $year) {
            return '-';
        }

        return sprintf('%s / %s', $year, (int) $year + 1);
    }

    private function formatDate($value): string
    {
        return $value?->locale('id')->translatedFormat('d F Y') ?: '-';
    }

    private function inferLevelFromName(string $value): string
    {
        if (preg_match('/\bD[1-4]\b|\bS[1-3]\b/i', $value, $matches)) {
            return Str::upper($matches[0]);
        }

        return 'S1';
    }

    private function shortenFacultyName(string $facultyName): string
    {
        return str_ireplace('Fakultas ', '', $facultyName) ?: $facultyName;
    }

    private function escape(string $value): string
    {
        return e($value);
    }
}
