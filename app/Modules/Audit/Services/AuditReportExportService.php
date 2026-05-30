<?php

namespace App\Modules\Audit\Services;

use App\Models\User;
use App\Modules\Audit\Models\AuditSchedule;
use App\Modules\Ptk\Models\TrxPtk;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\Shared\Converter;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\Image;

class AuditReportExportService
{
    /**
     * Temp image files created to normalize assets for Word export.
     *
     * @var array<int, string>
     */
    private array $temporaryWordImages = [];

    // ─── Unit conversions ────────────────────────────────────────────────────

    private function twip(float|int $cm): int
    {
        return (int) round(Converter::cmToTwip($cm));
    }

    // ─── PDF / HTML export (unchanged) ───────────────────────────────────────

    public function buildPdfHtml(AuditSchedule $schedule, Collection $findings): string
    {
        $context = $this->buildContext($schedule, $findings);
        $pdfLogoPath = $this->resolvePdfLogoPath($context['logo_path']);
        $findingRows = $this->buildPdfFindingRows($context['findings'], $context['auditor_initials']);
        $conclusionItems = collect($context['conclusions'])
            ->map(fn (string $line) => '<tr><td style="padding:4px 0 4px 18px; font-size:11pt; font-style:italic;">- ' . e($line) . '</td></tr>')
            ->implode('');

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan AMI - {$this->escape($context['faculty_name'])}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111111; margin: 0;">
    <table style="width:100%; border-collapse:collapse;">
        <tr>
            <td style="text-align:left; padding-top:40px;">
                {$this->buildPdfLogoMarkup($pdfLogoPath)}
            </td>
        </tr>
        <tr>
            <td style="text-align:left; color:#365F91; font-size:30pt; font-weight:bold; padding-top:12px;">LAPORAN</td>
        </tr>
        <tr>
            <td style="text-align:left; color:#365F91; font-size:24pt; font-weight:bold; padding-top:8px;">Audit Mutu Internal (AMI)</td>
        </tr>
        <tr>
            <td style="text-align:left; color:#365F91; font-size:22pt; font-weight:bold; padding-top:10px;">{$this->escape($context['cover_unit_label'])}</td>
        </tr>
        <tr>
            <td style="padding-top:34px;">
                <table style="width:430px; margin:0; border-collapse:collapse;">
                    <tr><td colspan="3" style="border-top:2px solid #7FB3D5; height:14px;"></td></tr>
                    {$this->buildPdfCoverMetaRows($context)}
                </table>
            </td>
        </tr>
    </table>

    <div style="page-break-before:always;"></div>

    <table style="width:100%; border-collapse:collapse;">
        <tr>
            <td style="text-align:center; font-size:12pt; font-weight:bold;">LAPORAN AUDIT MUTU INTERNAL</td>
        </tr>
        <tr>
            <td style="text-align:center; font-size:12pt; font-weight:bold; padding-bottom:14px;">{$this->escape(strtoupper($context['cover_unit_label']))}</td>
        </tr>
    </table>

    <table style="width:100%; border-collapse:collapse;">
        <tr><td style="font-size:12pt; font-weight:bold; padding:6px 0;">I. PENDAHULUAN</td></tr>
        <tr><td>{$this->buildPdfPendahuluanTable($context)}</td></tr>

        <tr><td style="font-size:12pt; font-weight:bold; padding:18px 0 6px;">II. TUJUAN AUDIT:</td></tr>
        <tr>
            <td style="padding-left:14px; font-size:11pt; font-style:italic; line-height:1.45;">
                a.&nbsp; Memastikan bahwa implementasi standar dikti telah sesuai dengan standar yang telah ditetapkan.<br>
                b.&nbsp; Memetakan kesiapan {$this->escape(strtolower($context['cover_unit_label']))} dalam melaksanakan program Akreditasi.<br>
                c.&nbsp; Memastikan kelancaran pelaksanaan pengelolaan {$this->escape(strtolower($context['cover_unit_label']))}.<br>
                d.&nbsp; Memetakan peluang peningkatan mutu {$this->escape(strtolower($context['cover_unit_label']))}.
            </td>
        </tr>

        <tr><td style="font-size:12pt; font-weight:bold; padding:18px 0 6px;">III. LINGKUP AUDIT:</td></tr>
        <tr><td style="font-size:11pt;">{$this->escape($context['scope_label'])}</td></tr>

        <tr><td style="font-size:12pt; font-weight:bold; padding:18px 0 6px;">IV. JADWAL AUDIT:</td></tr>
        <tr><td style="font-size:11pt; padding-bottom:6px;">Hari/Tanggal audit : {$this->escape($context['audit_date'])}</td></tr>
        <tr><td>{$this->buildPdfScheduleTable()}</td></tr>

        <tr><td style="font-size:12pt; font-weight:bold; padding:18px 0 6px;">V. TEMUAN AUDIT:</td></tr>
        <tr>
            <td>
                <table style="width:100%; border-collapse:collapse; font-size:10.5pt;">
                    <tr>
                        <th style="border:1px solid #111111; padding:6px; width:34px; text-align:center;">No.</th>
                        <th style="border:1px solid #111111; padding:6px; width:84px; text-align:center;">KTS/OB<br>(Initial Auditor)</th>
                        <th style="border:1px solid #111111; padding:6px; width:150px; text-align:center;">Referensi<br>(butir mutu)</th>
                        <th style="border:1px solid #111111; padding:6px; text-align:center;">Pernyataan</th>
                    </tr>
                    {$findingRows}
                </table>
            </td>
        </tr>

        <tr><td style="font-size:12pt; font-weight:bold; padding:18px 0 6px;">VI. KESIMPULAN AUDIT</td></tr>
        <tr>
            <td>
                <table style="width:100%; border-collapse:collapse;">
                    {$conclusionItems}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }

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

    // ─── PhpWord export (primary fix target) ─────────────────────────────────

    public function buildPhpWord(AuditSchedule $schedule, Collection $findings): PhpWord
    {
        $context = $this->buildContext($schedule, $findings);
        Settings::setOutputEscapingEnabled(true);
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(11);

        $this->registerStyles($phpWord);

        // A4 page, margins matching template (top=1418, right=1275, bottom=1276, left=1418 twips)
        $section = $phpWord->addSection([
            'marginTop'    => 1418,
            'marginRight'  => 1275,
            'marginBottom' => 1276,
            'marginLeft'   => 1418,
        ]);
        $section->getStyle()->setPageSizeW(11907);
        $section->getStyle()->setPageSizeH(16839);

        $this->buildCoverPage($section, $context);
        $section->addPageBreak();
        $this->buildContentPages($section, $context);

        return $phpWord;
    }

    /**
     * Build, patch, and save the Word document to a temp file.
     *
     * Use this instead of buildPhpWord() + manual save. PhpWord emits
     * w:val="single" w:sz="0" for zero-size borders which is invalid OOXML
     * and causes Word to refuse opening the file. This method patches the XML
     * inside the zip after saving, replacing those nodes with w:val="none".
     *
     * @return string Absolute path to the patched .docx temp file.
     */
    public function saveDocx(AuditSchedule $schedule, Collection $findings): string
    {
        $this->temporaryWordImages = [];

        try {
            $phpWord = $this->buildPhpWord($schedule, $findings);

            $tmpPath = tempnam(sys_get_temp_dir(), 'ami_') . '.docx';

            \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007')->save($tmpPath);

            $this->patchDocxBorders($tmpPath);

            return $tmpPath;
        } finally {
            $this->cleanupTemporaryWordImages();
        }
    }

    /**
     * Fix invalid border XML PhpWord writes into word/document.xml inside the zip.
     * w:val="single" w:sz="0" → w:val="none" w:sz="0"  (valid OOXML)
     */
    private function patchDocxBorders(string $docxPath): void
    {
        $zip = new \ZipArchive();
        if ($zip->open($docxPath) !== true) {
            return;
        }

        $xml = $zip->getFromName('word/document.xml');
        if ($xml === false) {
            $zip->close();
            return;
        }

        // Replace val="single" sz="0" (attributes in either order)
        $patched = preg_replace(
            '/w:val="single"(\s[^>]*?)?w:sz="0"/',
            'w:val="none"$1w:sz="0"',
            $xml
        );
        $patched = preg_replace(
            '/w:sz="0"(\s[^>]*?)?w:val="single"/',
            'w:sz="0"$1w:val="none"',
            $patched ?? $xml
        );

        $zip->deleteName('word/document.xml');
        $zip->addFromString('word/document.xml', $patched ?? $xml);
        $zip->close();
    }

    // ─── Style registration ───────────────────────────────────────────────────

    private function registerStyles(PhpWord $phpWord): void
    {
        // Section headings (bold, 12pt, roman numeral list via numbering)
        $phpWord->addParagraphStyle('sectionHeading', [
            'spaceAfter'  => 0,
            'spaceBefore' => 0,
            'lineHeight'  => 1.0,
        ]);

        // Cover centre paragraphs
        $phpWord->addParagraphStyle('coverCenter', [
            'alignment'  => Jc::CENTER,
            'spaceAfter' => 0,
            'spaceBefore'=> 0,
        ]);

        $phpWord->addParagraphStyle('coverLeft', [
            'alignment'  => Jc::START,
            'spaceAfter' => 0,
            'spaceBefore'=> 0,
        ]);

        // General tight body text
        $phpWord->addParagraphStyle('bodyTight', [
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
        ]);

        // Centre-aligned tight (table headers, number cells)
        $phpWord->addParagraphStyle('centerTight', [
            'alignment'  => Jc::CENTER,
            'spaceAfter' => 0,
            'spaceBefore'=> 0,
            'lineHeight' => 1.0,
        ]);

        // Italic goal items (a. b. c. d.)
        $phpWord->addParagraphStyle('goalItem', [
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
            'indentation' => ['left' => 1440, 'hanging' => 360],
        ]);

        // Conclusion bullet (- dash bullet, matching template abstractNum6)
        $phpWord->addParagraphStyle('conclusionBullet', [
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
            'indentation' => ['left' => 1080, 'hanging' => 360],
        ]);
    }

    // ─── Cover page ───────────────────────────────────────────────────────────

    private function buildCoverPage($section, array $context): void
    {
        // ── Border helpers ────────────────────────────────────────────────────
        // IMPORTANT: PhpWord emits w:val="single" w:sz="0" when borderSize=0 is set
        // at the TABLE level (via borderSize/borderColor array keys). This is invalid
        // OOXML and corrupts the file. The only valid approach to suppress borders is:
        //   • At TABLE level: omit ALL border props (hasBorder() returns false → no
        //     <w:tblBorders> element written at all).
        //   • At CELL level: pass borderXxxStyle='none' which correctly produces
        //     w:val="none" w:sz="0" — valid OOXML that Word accepts.
        $cellNoBorder = [
            'borderTopSize'    => 0, 'borderTopColor'    => 'FFFFFF', 'borderTopStyle'    => 'none',
            'borderLeftSize'   => 0, 'borderLeftColor'   => 'FFFFFF', 'borderLeftStyle'   => 'none',
            'borderRightSize'  => 0, 'borderRightColor'  => 'FFFFFF', 'borderRightStyle'  => 'none',
            'borderBottomSize' => 0, 'borderBottomColor' => 'FFFFFF', 'borderBottomStyle' => 'none',
        ];

        // ── Logo ──────────────────────────────────────────────────────────────
        // Single-cell table (no table-level borders) keeps the image reliably centred.
        $logoTable = $section->addTable([
            'alignment'        => Jc::START,
            'cellMarginTop'    => 0,
            'cellMarginBottom' => 0,
            'cellMarginLeft'   => 0,
            'cellMarginRight'  => 0,
        ]);
        $logoTable->addRow($this->twip(3.0));
        $logoCell = $logoTable->addCell(9214, array_merge($cellNoBorder, ['valign' => 'center']));

        if ($context['logo_path']) {
            $logoCell->addImage($this->prepareWordImagePath($context['logo_path']) ?? $context['logo_path'], [
                'width'         => 118,
                'height'        => 118,
                'alignment'     => Jc::START,
                'wrappingStyle' => Image::WRAPPING_STYLE_INLINE,
            ]);
        } else {
            $logoCell->addText('UNIVERSITAS ISLAM MADURA', ['bold' => true, 'size' => 14], 'coverLeft');
        }

        $section->addTextBreak(1);

        // ── Cover titles ─────────────────────────────────────────────────────
        $section->addText('LAPORAN',                    ['bold' => true, 'size' => 36, 'color' => '365F91'], 'coverLeft');
        $section->addText('Audit Mutu Internal (AMI)',  ['bold' => true, 'size' => 28, 'color' => '365F91'], 'coverLeft');
        $section->addText($context['cover_unit_label'], ['bold' => true, 'size' => 28, 'color' => '365F91'], 'coverLeft');

        $section->addTextBreak(1);

        // ── Horizontal rule ───────────────────────────────────────────────────
        // Table with NO table-level borders. Cell has top/left/right = none,
        // only bottom border is drawn. Produces valid w:val="none" on suppressed sides.
        $ruleTable = $section->addTable(['alignment' => Jc::CENTER]);
        $ruleTable->addRow(200);
        $ruleTable->addCell(9214, [
            'borderTopSize'    => 0,  'borderTopColor'    => 'FFFFFF', 'borderTopStyle'    => 'none',
            'borderLeftSize'   => 0,  'borderLeftColor'   => 'FFFFFF', 'borderLeftStyle'   => 'none',
            'borderRightSize'  => 0,  'borderRightColor'  => 'FFFFFF', 'borderRightStyle'  => 'none',
            'borderBottomSize' => 12, 'borderBottomColor' => '17365D', 'borderBottomStyle' => 'single',
        ])->addText('');

        $section->addTextBreak(1);

        // ── Meta information table ────────────────────────────────────────────
        $metaColWidths = [3456, 432, 5100];
        $metaTable = $section->addTable([
            'alignment'        => Jc::CENTER,
            'cellMarginTop'    => 40,
            'cellMarginBottom' => 40,
            'cellMarginLeft'   => 60,
            'cellMarginRight'  => 60,
        ]);

        foreach ($this->buildCoverMetaRows($context) as $row) {
            $metaTable->addRow();
            $metaTable->addCell($metaColWidths[0], $cellNoBorder)
                ->addText($row['label'], ['bold' => true, 'size' => 16], 'bodyTight');
            $metaTable->addCell($metaColWidths[1], $cellNoBorder)
                ->addText(':', ['bold' => true, 'size' => 16], 'centerTight');
            $metaTable->addCell($metaColWidths[2], $cellNoBorder)
                ->addText($row['value'], ['bold' => true, 'size' => 16], 'bodyTight');
        }
    }

    // ─── Content pages ────────────────────────────────────────────────────────

    private function buildContentPages($section, array $context): void
    {
        // Page title (centred bold 12pt, all-caps)
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
        $section->addTextBreak(1);

        // I. PENDAHULUAN
        $this->addSectionHeading($section, 'I.    PENDAHULUAN');
        $this->buildPendahuluanTable($section, $context);

        // II. TUJUAN AUDIT
        $this->addSectionHeading($section, 'II.   TUJUAN AUDIT:');
        foreach ($this->buildGoalItems($context) as $index => $goal) {
            $section->addText(
                chr(97 + $index) . '.   ' . $goal,
                ['italic' => true, 'size' => 11],
                'goalItem'
            );
        }

        // III. LINGKUP AUDIT
        $this->addSectionHeading($section, 'III.  LINGKUP AUDIT:');
        $section->addText($context['scope_label'], ['size' => 11], 'bodyTight');

        // IV. JADWAL AUDIT
        $this->addSectionHeading($section, 'IV.   JADWAL AUDIT:');
        $section->addText(
            'Hari/Tanggal audit : ' . $context['audit_date'],
            ['size' => 11],
            'bodyTight'
        );
        $section->addTextBreak(1);
        $this->buildScheduleTable($section);

        // V. TEMUAN AUDIT
        $this->addSectionHeading($section, 'V.    TEMUAN AUDIT:');
        $this->buildFindingsTable($section, $context);

        // VI. KESIMPULAN AUDIT
        $this->addSectionHeading($section, 'VI.   KESIMPULAN AUDIT');
        foreach ($context['conclusions'] as $line) {
            $section->addText(
                '-   ' . $line,
                ['italic' => true, 'size' => 11],
                'conclusionBullet'
            );
        }
    }

    // ─── Section heading helper ───────────────────────────────────────────────

    /**
     * Adds a bold 12pt section heading with spacing matching the template
     * (spaceAfter=0, line=240 single-spaced).
     */
    private function addSectionHeading($section, string $text): void
    {
        $section->addTextBreak(1);
        $section->addText($text, ['bold' => true, 'size' => 12], 'sectionHeading');
    }

    // ─── Pendahuluan table ────────────────────────────────────────────────────

    /**
     * Matches template table (Table 0):
     *   Column widths: 1762 | 2953 | 741 | 842 | 2693  (total 8991 twips)
     *   Many rows use gridSpan=4 on col-2..5 combined (width=7229).
     */
    private function buildPendahuluanTable($section, array $context): void
    {
        // Template column widths from tblGrid
        $c1 = 1762;  // label column
        $c2 = 2953;  // value col A
        $c3 = 741;   // "Telp./Unit :" label
        $c4 = 842;   // separator/value
        $c5 = 2693;  // value col B
        $spanAll = $c2 + $c3 + $c4 + $c5; // 7229 (cols 2-5 merged)
        $spanRight = $c3 + $c4 + $c5;      // 4276 (cols 3-5 merged)

        $tblStyle = [
            'alignment'        => Jc::CENTER,
            'borderSize'       => 6,
            'borderColor'      => '111111',
            'cellMarginTop'    => 30,
            'cellMarginBottom' => 30,
            'cellMarginLeft'   => 50,
            'cellMarginRight'  => 50,
        ];
        $table = $section->addTable($tblStyle);
        $fs = 10;  // font size matching template (10pt = sz 20)

        // Row: Fakultas (spans cols 2-5)
        $table->addRow();
        $table->addCell($c1)->addText('Fakultas', ['size' => $fs], 'bodyTight');
        $table->addCell($spanAll, ['gridSpan' => 4])->addText($context['faculty_name'], ['size' => $fs], 'bodyTight');

        // Row: Program Studi
        $table->addRow();
        $table->addCell($c1)->addText('Program Studi', ['size' => $fs], 'bodyTight');
        $table->addCell($spanAll, ['gridSpan' => 4])->addText($context['prodi_name'], ['size' => $fs], 'bodyTight');

        // Row: Alamat
        $table->addRow();
        $table->addCell($c1)->addText('Alamat', ['size' => $fs], 'bodyTight');
        $table->addCell($spanAll, ['gridSpan' => 4])->addText($context['location'], ['size' => $fs], 'bodyTight');

        // Row: Nama Auditee | value | Telp. : | -
        $auditeeLabel = $context['prodi'] ? 'Nama Kaprodi' : 'Nama Dekan';
        $table->addRow();
        $table->addCell($c1)->addText($auditeeLabel, ['size' => $fs], 'bodyTight');
        $table->addCell($c2)->addText($context['auditee_name'], ['size' => $fs], 'bodyTight');
        $table->addCell($c3 + $c4, ['gridSpan' => 2])->addText('Telp. :', ['size' => $fs], 'bodyTight');
        $table->addCell($c5)->addText('-', ['size' => $fs], 'bodyTight');

        // Row: Tanggal Audit
        $table->addRow();
        $table->addCell($c1)->addText('Tanggal Audit', ['size' => $fs], 'bodyTight');
        $table->addCell($spanAll, ['gridSpan' => 4])->addText($context['audit_date'], ['size' => $fs], 'bodyTight');

        // Row: Ketua Auditor (multi-line cell)
        $table->addRow();
        $table->addCell($c1)->addText('Ketua Auditor', ['size' => $fs], 'bodyTight');
        $ketuaCell = $table->addCell($spanAll, ['gridSpan' => 4]);
        $ketuaCell->addText('Nama     :  ' . $context['lead_auditor'], ['size' => $fs], 'bodyTight');
        $ketuaCell->addText($context['cover_unit_label'] . '  :  ' . $context['faculty_short_name'], ['size' => $fs], 'bodyTight');
        $ketuaCell->addText('Telp.      :  -', ['size' => $fs], 'bodyTight');

        // Row: Anggota Auditor (multi-line cell)
        $table->addRow();
        $table->addCell($c1)->addText('Anggota Auditor', ['size' => $fs], 'bodyTight');
        $anggotaCell = $table->addCell($spanAll, ['gridSpan' => 4]);
        $anggotaCell->addText('Nama     :  ' . $context['auditor'], ['size' => $fs], 'bodyTight');
        $anggotaCell->addText($context['cover_unit_label'] . '  :  ' . $context['faculty_short_name'], ['size' => $fs], 'bodyTight');
        $anggotaCell->addText('Telp.      :  -', ['size' => $fs], 'bodyTight');

        // Row: Signature row (~2cm height)
        $table->addRow($this->twip(1.4));
        $sigLabelStyle = ['valign' => 'top'];
        $sigCellStyle  = ['valign' => 'center'];

        $sigLabelCell = $table->addCell($c1, $sigLabelStyle);
        $sigLabelCell->addText('Tanda Tangan', ['size' => $fs], 'bodyTight');
        $sigLabelCell->addText('Ketua Auditor', ['size' => $fs], 'bodyTight');

        $leadSigCell = $table->addCell($c2, $sigCellStyle);
        $this->appendSignatureToCell($leadSigCell, $context['lead_signature_path']);

        $auditeeLabelCell = $table->addCell($c3 + $c4, array_merge(['gridSpan' => 2], $sigLabelStyle));
        $auditeeLabelCell->addText('Tanda Tangan', ['size' => $fs], 'bodyTight');
        $auditeeLabelCell->addText($context['auditee_label'], ['size' => $fs], 'bodyTight');

        $auditeeSigCell = $table->addCell($c5, $sigCellStyle);
        $this->appendSignatureToCell($auditeeSigCell, $context['auditee_signature_path']);
    }

    // ─── Schedule table ───────────────────────────────────────────────────────

    /**
     * Matches template Table 2 column widths: 567 | 2126 | 5386 (total 8079 twips).
     */
    private function buildScheduleTable($section): void
    {
        $c1 = 567;   // No
        $c2 = 2126;  // Jam
        $c3 = 5386;  // Kegiatan Audit

        $rows = [
            ['1', '09.00 - 12.15', 'Pembukaan & Pertemuan dengan Auditee'],
            ['2', '',               'Pertemuan dengan Staf Dosen'],
            ['3', '',               'Pertemuan dengan Karyawan'],
            ['4', '',               'Pertemuan dengan Mahasiswa'],
            ['5', '',               'Pertemuan dengan alumni/pengguna lulusan (jika ada)'],
            ['6', '12.15 - 12.30', 'Penyampaian Temuan & Penutupan'],
        ];

        $table = $section->addTable([
            'alignment'        => Jc::CENTER,
            'borderSize'       => 6,
            'borderColor'      => '111111',
            'cellMarginTop'    => 20,
            'cellMarginBottom' => 20,
            'cellMarginLeft'   => 45,
            'cellMarginRight'  => 45,
        ]);
        $fs = 10;

        // Header row
        $table->addRow();
        $table->addCell($c1)->addText('No',             ['bold' => true, 'size' => $fs], 'centerTight');
        $table->addCell($c2)->addText('Jam',            ['bold' => true, 'size' => $fs], 'centerTight');
        $table->addCell($c3)->addText('Kegiatan Audit', ['bold' => true, 'size' => $fs], 'centerTight');

        foreach ($rows as $row) {
            $table->addRow();
            $table->addCell($c1)->addText($row[0], ['size' => $fs], 'centerTight');
            $table->addCell($c2)->addText($row[1], ['size' => $fs], 'bodyTight');
            $table->addCell($c3)->addText($row[2], ['italic' => true, 'size' => $fs], 'bodyTight');
        }
    }

    // ─── Findings table ───────────────────────────────────────────────────────

    /**
     * Matches template Table 3 column widths: 630 | 1170 | 2660 | 4502 (total 8962 twips).
     */
    private function buildFindingsTable($section, array $context): void
    {
        $c1 = 630;   // No.
        $c2 = 1170;  // KTS/OB (Initial Auditor)
        $c3 = 2660;  // Referensi (butir mutu)
        $c4 = 4502;  // Pernyataan

        $table = $section->addTable([
            'alignment'        => Jc::CENTER,
            'borderSize'       => 6,
            'borderColor'      => '111111',
            'cellMarginTop'    => 25,
            'cellMarginBottom' => 25,
            'cellMarginLeft'   => 40,
            'cellMarginRight'  => 40,
        ]);
        $fs = 10;

        // Header
        $table->addRow();
        $noCell = $table->addCell($c1);
        $noCell->addText('No.',       ['bold' => true, 'size' => $fs], 'centerTight');
        $ktsCell = $table->addCell($c2);
        $ktsCell->addText('KTS/OB',           ['bold' => true, 'size' => $fs], 'centerTight');
        $ktsCell->addText('(Initial Auditor)', ['bold' => true, 'size' => $fs], 'centerTight');
        $refCell = $table->addCell($c3);
        $refCell->addText('Referensi',   ['bold' => true, 'size' => $fs], 'centerTight');
        $refCell->addText('(butir mutu)',['bold' => true, 'size' => $fs], 'centerTight');
        $table->addCell($c4)->addText('Pernyataan', ['bold' => true, 'size' => $fs], 'centerTight');

        if ($context['findings']->isEmpty()) {
            $table->addRow();
            $table->addCell($c1 + $c2 + $c3 + $c4, ['gridSpan' => 4])
                ->addText('Tidak ada temuan audit.', ['size' => $fs], 'centerTight');
            return;
        }

        foreach ($context['findings']->values() as $index => $ptk) {
            $table->addRow();
            $table->addCell($c1)->addText((string) ($index + 1),           ['size' => $fs], 'centerTight');
            $table->addCell($c2)->addText($context['auditor_initials'],     ['size' => $fs], 'centerTight');
            $table->addCell($c3)->addText($this->buildFindingReference($ptk), ['size' => $fs], 'centerTight');
            $table->addCell($c4)->addText($ptk->finding_summary ?: '-',    ['size' => $fs], 'bodyTight');
        }
    }

    // ─── Signature helper ─────────────────────────────────────────────────────

    private function appendSignatureToCell($cell, ?string $path): void
    {
        $preparedPath = $this->prepareWordImagePath($path);

        if ($preparedPath) {
            $cell->addImage($preparedPath, [
                'width'         => 110,
                'height'        => 45,
                'alignment'     => Jc::CENTER,
                'wrappingStyle' => Image::WRAPPING_STYLE_INLINE,
            ]);
        } else {
            // Empty placeholder preserving row height
            $cell->addText('', ['size' => 10], 'centerTight');
        }
    }


    // ─── Context builder ──────────────────────────────────────────────────────

    private function buildContext(AuditSchedule $schedule, Collection $findings): array
    {
        $facultyName   = $schedule->faculty?->name ?: '-';
        $prodiName     = $schedule->prodi?->name   ?: '-';
        $coverUnitLabel = $schedule->prodi ? 'Program Studi' : 'Fakultas';
        $academicYear  = $this->formatAcademicYear($schedule->standard?->periode_tahun);

        return [
            'faculty_name'          => $facultyName,
            'faculty_short_name'    => $this->shortenFacultyName($facultyName),
            'prodi_name'            => $prodiName,
            'prodi'                 => $schedule->prodi,
            'auditee_name'          => $schedule->auditee?->name ?: '-',
            'lead_auditor'          => $schedule->leadAuditor?->name ?: '-',
            'auditor'               => $schedule->auditor?->name ?: '-',
            'academic_year'         => $academicYear,
            'audit_date'            => $this->formatDate($schedule->scheduled_start),
            'location'              => $schedule->location ?: 'Jl. Ponpes Miftahul Ulum Bettet Pamekasan',
            'cover_unit_label'      => $coverUnitLabel,
            'auditee_label'         => $schedule->prodi ? 'Auditee' : 'Dekan',
            'scope_label'           => $schedule->standard?->name
                ? sprintf('%s tahun akademik %s', $schedule->standard->name, $academicYear)
                : sprintf('Standar Pendidikan tahun akademik %s', $academicYear),
            'conclusions'           => $this->buildConclusions($schedule, $findings),
            'findings'              => $findings,
            'auditor_initials'      => $this->buildAuditorInitials($schedule),
            'logo_path'             => $this->resolveLogoPath(),
            'lead_signature_path'   => $this->resolveUserSignaturePath($schedule->leadAuditor),
            'auditee_signature_path'=> $this->resolveUserSignaturePath($schedule->auditee),
        ];
    }

    // ─── Cover meta rows ──────────────────────────────────────────────────────

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
            ['label' => 'Jenjang',           'value' => $this->inferLevelFromName($context['prodi_name'])],
            ['label' => 'Fakultas',           'value' => $context['faculty_short_name']],
            [
                'label' => $context['prodi_name'] !== '-' ? 'Program Studi' : 'Auditee',
                'value' => $context['prodi_name'] !== '-' ? $context['prodi_name'] : $context['auditee_name'],
            ],
            ['label' => 'Ketua Tim Auditor', 'value' => $context['lead_auditor']],
            ['label' => 'Anggota',           'value' => $context['auditor']],
            ['label' => 'Tahun Akademik',    'value' => $context['academic_year']],
        ];
    }

    // ─── HTML helper methods (PDF/Word HTML export) ───────────────────────────

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

    private function buildPdfCoverMetaRows(array $context): string
    {
        return collect($this->buildCoverMetaRows($context))
            ->map(fn (array $row) => sprintf(
                '<tr>
                    <td style="padding:6px 8px; font-size:16pt; font-weight:bold; width:220px;">%s</td>
                    <td style="padding:6px 8px; font-size:16pt; font-weight:bold; width:18px; text-align:center;">:</td>
                    <td style="padding:6px 8px; font-size:16pt; font-weight:bold;">%s</td>
                </tr>',
                e($row['label']),
                e($row['value'])
            ))
            ->implode('');
    }

    private function buildHtmlPendahuluanTable(array $context): string
    {
        $leadSig   = $this->buildHtmlSignatureMarkup($context['lead_signature_path']);
        $auditeeSig = $this->buildHtmlSignatureMarkup($context['auditee_signature_path']);
        $auditeeLabel = $context['prodi'] ? 'Nama Kaprodi' : 'Nama Dekan';

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
        <td class="label">{$this->escape($auditeeLabel)}</td>
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
        <td colspan="3">
            Nama     :  {$this->escape($context['lead_auditor'])}<br />
            {$this->escape($context['cover_unit_label'])}  :  {$this->escape($context['faculty_short_name'])}<br />
            Telp.      :  -
        </td>
    </tr>
    <tr>
        <td class="label">Anggota Auditor</td>
        <td colspan="3">
            Nama     :  {$this->escape($context['auditor'])}<br />
            {$this->escape($context['cover_unit_label'])}  :  {$this->escape($context['faculty_short_name'])}<br />
            Telp.      :  -
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

    private function buildPdfPendahuluanTable(array $context): string
    {
        $leadSig    = $this->buildPdfSignatureMarkup($context['lead_signature_path']);
        $auditeeSig = $this->buildPdfSignatureMarkup($context['auditee_signature_path']);
        $auditeeLabel = $context['prodi'] ? 'Nama Kaprodi' : 'Nama Dekan';

        return <<<HTML
<table style="width:100%; border-collapse:collapse; font-size:10.5pt;">
    <tr><td style="border:1px solid #111111; padding:4px 6px; width:120px;">Fakultas</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">{$this->escape($context['faculty_name'])}</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">Program Studi</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">{$this->escape($context['prodi_name'])}</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">Alamat</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">{$this->escape($context['location'])}</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">{$this->escape($auditeeLabel)}</td><td style="border:1px solid #111111; padding:4px 6px;">{$this->escape($context['auditee_name'])}</td><td style="border:1px solid #111111; padding:4px 6px; width:90px;">Telp. :</td><td style="border:1px solid #111111; padding:4px 6px;">-</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">Tanggal Audit</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">{$this->escape($context['audit_date'])}</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">Ketua Auditor</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">Nama     :  {$this->escape($context['lead_auditor'])}<br>{$this->escape($context['cover_unit_label'])}  :  {$this->escape($context['faculty_short_name'])}<br>Telp.      :  -</td></tr>
    <tr><td style="border:1px solid #111111; padding:4px 6px;">Anggota Auditor</td><td colspan="3" style="border:1px solid #111111; padding:4px 6px;">Nama     :  {$this->escape($context['auditor'])}<br>{$this->escape($context['cover_unit_label'])}  :  {$this->escape($context['faculty_short_name'])}<br>Telp.      :  -</td></tr>
    <tr>
        <td style="border:1px solid #111111; padding:4px 6px;">Tanda Tangan<br>Ketua Auditor</td>
        <td style="border:1px solid #111111; padding:4px 6px; text-align:center; height:60px;">{$leadSig}</td>
        <td style="border:1px solid #111111; padding:4px 6px;">Tanda Tangan<br>{$this->escape($context['auditee_label'])}</td>
        <td style="border:1px solid #111111; padding:4px 6px; text-align:center; height:60px;">{$auditeeSig}</td>
    </tr>
</table>
HTML;
    }

    private function buildHtmlScheduleTable(string $auditDate): string
    {
        $rows = [
            ['1', '09.00 - 12.15', 'Pembukaan & Pertemuan dengan Auditee'],
            ['2', '',               'Pertemuan dengan Staf Dosen'],
            ['3', '',               'Pertemuan dengan Karyawan'],
            ['4', '',               'Pertemuan dengan Mahasiswa'],
            ['5', '',               'Pertemuan dengan alumni/pengguna lulusan (jika ada)'],
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

    private function buildPdfScheduleTable(): string
    {
        $rows = [
            ['1', '09.00 - 12.15', 'Pembukaan & Pertemuan dengan Auditee'],
            ['2', '',               'Pertemuan dengan Staf Dosen'],
            ['3', '',               'Pertemuan dengan Karyawan'],
            ['4', '',               'Pertemuan dengan Mahasiswa'],
            ['5', '',               'Pertemuan dengan alumni/pengguna lulusan (jika ada)'],
            ['6', '12.15 - 12.30', 'Penyampaian Temuan & Penutupan'],
        ];

        $htmlRows = collect($rows)->map(fn (array $row) => sprintf(
            '<tr><td style="border:1px solid #111111; padding:4px 6px; text-align:center;">%s</td><td style="border:1px solid #111111; padding:4px 6px;">%s</td><td style="border:1px solid #111111; padding:4px 6px;"><i>%s</i></td></tr>',
            e($row[0]),
            e($row[1]),
            e($row[2])
        ))->implode('');

        return <<<HTML
<table style="width:100%; border-collapse:collapse; font-size:10.5pt;">
    <tr>
        <th style="border:1px solid #111111; padding:4px 6px; width:34px; text-align:center;">No</th>
        <th style="border:1px solid #111111; padding:4px 6px; width:120px; text-align:center;">Jam</th>
        <th style="border:1px solid #111111; padding:4px 6px; text-align:center;">Kegiatan Audit</th>
    </tr>
    {$htmlRows}
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

    private function buildPdfFindingRows(Collection $findings, string $auditorInitials): string
    {
        $rows = $findings->values()->map(fn (TrxPtk $ptk, int $index) => sprintf(
            '<tr>
                <td style="border:1px solid #111111; padding:6px; text-align:center;">%s</td>
                <td style="border:1px solid #111111; padding:6px; text-align:center;">%s</td>
                <td style="border:1px solid #111111; padding:6px; text-align:center;">%s</td>
                <td style="border:1px solid #111111; padding:6px;">%s</td>
            </tr>',
            $index + 1,
            e($auditorInitials),
            e($this->buildFindingReference($ptk)),
            e($ptk->finding_summary ?: '-')
        ))->implode('');

        if ($rows !== '') {
            return $rows;
        }

        return '<tr><td colspan="4" style="border:1px solid #111111; padding:6px; text-align:center;">Tidak ada temuan audit.</td></tr>';
    }

    // ─── Image markup helpers ─────────────────────────────────────────────────

    private function buildHtmlLogoMarkup(?string $logoPath): string
    {
        if (! $logoPath || ! is_file($logoPath)) {
            return '';
        }
        return '<img class="cover-logo" src="' . e($this->toDataUri($logoPath, 'image/png')) . '" alt="Logo Universitas Islam Madura" />';
    }

    private function buildPdfLogoMarkup(?string $logoPath): string
    {
        if (! $logoPath || ! is_file($logoPath)) {
            return '';
        }
        $mimeType = mime_content_type($logoPath) ?: 'image/jpeg';
        return '<img src="' . e($this->toDataUri($logoPath, $mimeType)) . '" alt="Logo Universitas Islam Madura" style="width:118px; height:auto;" />';
    }

    private function buildHtmlSignatureMarkup(?string $signaturePath): string
    {
        if (! $signaturePath || ! is_file($signaturePath)) {
            return '';
        }
        $mimeType = mime_content_type($signaturePath) ?: 'image/png';
        return '<img class="signature-image" src="' . e($this->toDataUri($signaturePath, $mimeType)) . '" alt="Tanda Tangan" />';
    }

    private function buildPdfSignatureMarkup(?string $signaturePath): string
    {
        if (! $signaturePath || ! is_file($signaturePath)) {
            return '';
        }
        $mimeType = mime_content_type($signaturePath) ?: 'image/png';
        return '<img src="' . e($this->toDataUri($signaturePath, $mimeType)) . '" alt="Tanda Tangan" style="max-width:120px; max-height:48px; width:auto; height:auto;" />';
    }

    // ─── Path / IO helpers ────────────────────────────────────────────────────

    private function resolveLogoPath(): ?string
    {
        $preferredLogo = public_path('logo-uim.png');
        if (is_file($preferredLogo)) {
            return $preferredLogo;
        }

        $publicLogo = public_path('uim-report-logo.png');
        return is_file($publicLogo) ? $publicLogo : null;
    }

    private function resolvePdfLogoPath(?string $logoPath): ?string
    {
        $preferredPdfLogo = public_path('logo-uim-pdf.jpg');
        if (is_file($preferredPdfLogo)) {
            return $preferredPdfLogo;
        }

        return $logoPath;
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

    private function prepareWordImagePath(?string $path): ?string
    {
        if (! $path || ! is_file($path)) {
            return null;
        }

        if (basename($path) === 'logo-uim.png') {
            return $path;
        }

        $wordPngPath = preg_replace('/\.png$/i', '-word.png', $path);
        if (is_string($wordPngPath) && $wordPngPath !== $path && is_file($wordPngPath)) {
            return $wordPngPath;
        }

        $wordJpgPath = preg_replace('/\.png$/i', '-word.jpg', $path);
        if (is_string($wordJpgPath) && $wordJpgPath !== $path && is_file($wordJpgPath)) {
            return $wordJpgPath;
        }

        return $this->convertImageToJpeg($path) ?? $path;
    }

    private function convertImageToJpeg(string $path): ?string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagejpeg')) {
            return null;
        }

        $imageData = @file_get_contents($path);
        if ($imageData === false) {
            return null;
        }

        $image = @imagecreatefromstring($imageData);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $canvas = imagecreatetruecolor($width, $height);
        if ($canvas === false) {
            imagedestroy($image);
            return null;
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);

        $tmpFile = tempnam(sys_get_temp_dir(), 'ami_word_img_');
        if ($tmpFile === false) {
            imagedestroy($image);
            imagedestroy($canvas);
            return null;
        }

        $tmpJpeg = $tmpFile . '.jpg';
        @unlink($tmpFile);

        $saved = @imagejpeg($canvas, $tmpJpeg, 95);
        imagedestroy($image);
        imagedestroy($canvas);

        if (! $saved) {
            @unlink($tmpJpeg);
            return null;
        }

        $this->temporaryWordImages[] = $tmpJpeg;

        return $tmpJpeg;
    }

    private function cleanupTemporaryWordImages(): void
    {
        foreach ($this->temporaryWordImages as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }

        $this->temporaryWordImages = [];
    }

    // ─── Formatting helpers ───────────────────────────────────────────────────

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
            $lines = array_values(array_filter(
                array_map('trim', preg_split('/\R/u', $schedule->audit_period_conclusion) ?: [])
            ));
            if ($lines !== []) {
                return $lines;
            }
        }

        $unitName = $schedule->faculty?->name ?: $schedule->prodi?->name ?: 'unit audit';

        return [
            sprintf(
                'Kelengkapan dokumen standar tahun akademik %s %s telah ditelaah.',
                $this->formatAcademicYear($schedule->standard?->periode_tahun),
                $unitName
            ),
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
