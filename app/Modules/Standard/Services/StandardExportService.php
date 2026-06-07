<?php

namespace App\Modules\Standard\Services;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\VerticalJc;

class StandardExportService
{
    private int $headerCounter = 0;

    private int $statementCounter = 0;

    public function saveDocx(MstStandard $standard): string
    {
        Settings::setOutputEscapingEnabled(true);

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);
        $section = $phpWord->addSection([
            'marginTop' => 1250,
            'marginRight' => 1150,
            'marginBottom' => 1250,
            'marginLeft' => 1150,
        ]);

        $this->buildNativeWordDocument($section, $standard);

        $temporaryPath = tempnam(sys_get_temp_dir(), 'standard_export_');
        if ($temporaryPath === false) {
            throw new \RuntimeException('Gagal membuat file sementara untuk ekspor standar.');
        }

        $docxPath = $temporaryPath . '.docx';
        @unlink($temporaryPath);

        try {
            IOFactory::createWriter($phpWord, 'Word2007')->save($docxPath);
        } catch (\Throwable $exception) {
            @unlink($docxPath);
            throw $exception;
        }

        return $docxPath;
    }

    private function buildNativeWordDocument(mixed $section, MstStandard $standard): void
    {
        $tree = MstMetric::where('standard_id', $standard->id)
            ->whereNull('parent_id')
            ->orderBy('order')
            ->with('childrenRecursive')
            ->get();

        $documentCode = $standard->standard_code ?: $this->getDocumentCode($standard);
        $effectivePeriod = $standard->periode_tahun
            ? sprintf('%s / %s', $standard->periode_tahun, (int) $standard->periode_tahun + 1)
            : '-';
        $documentDate = $standard->document_date
            ?: $standard->rector_approved_at?->format('d F Y')
            ?: $standard->updated_at?->format('d F Y')
            ?: now()->format('d F Y');
        $pageRange = $standard->page_count
            ? '1-' . $standard->page_count
            : '1-' . max(1, $tree->count() + 3);

        $borderedTable = [
            'borderSize' => 8,
            'borderColor' => '000000',
            'cellMargin' => 90,
        ];
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 0];
        $cellStyle = ['valign' => VerticalJc::CENTER];

        $header = $section->addTable($borderedTable + ['width' => 100 * 50, 'unit' => 'pct']);
        $header->addRow(1250);
        $logoCell = $header->addCell(1700, $cellStyle);
        $logoPath = public_path('logo-uim.png');
        if (is_file($logoPath)) {
            $logoCell->addImage($logoPath, [
                'width' => 74,
                'height' => 74,
                'alignment' => Jc::CENTER,
            ]);
        } else {
            $logoCell->addText('E-SPMI', ['bold' => true, 'size' => 12], $center);
        }

        $identityCell = $header->addCell(5000, $cellStyle);
        $identityCell->addText('UNIVERSITAS ISLAM MADURA', ['bold' => true, 'size' => 13], $center);
        $identityCell->addText('SISTEM PENJAMINAN MUTU INTERNAL', ['bold' => true, 'size' => 10], $center);
        $identityCell->addText('DOKUMEN STANDAR MUTU', ['bold' => true, 'size' => 11], $center);

        $controlCell = $header->addCell(3300, ['valign' => VerticalJc::CENTER, 'gridSpan' => 1]);
        $control = $controlCell->addTable($borderedTable);
        foreach ([
            ['Kode', $documentCode],
            ['Tanggal', $documentDate],
            ['Status', (string) $standard->status],
            ['Revisi', (string) ($standard->revision_number ?? 0)],
            ['Halaman', $pageRange],
        ] as [$label, $value]) {
            $control->addRow();
            $control->addCell(900, $cellStyle)->addText($label, ['bold' => true, 'size' => 9]);
            $control->addCell(2100, $cellStyle)->addText((string) $value, ['size' => 9]);
        }

        $section->addTextBreak();
        $section->addText('STANDAR SPMI', ['bold' => true, 'size' => 12], $center);
        $section->addText(mb_strtoupper($standard->name), ['bold' => true, 'size' => 15], $center);
        $section->addText('Periode ' . $effectivePeriod, ['size' => 11], $center);
        $section->addTextBreak();

        $this->addProcessTable($section, $borderedTable);

        $section->addTextBreak();
        $section->addText('INFORMASI DOKUMEN', ['bold' => true, 'size' => 12]);
        $meta = $section->addTable($borderedTable);
        foreach ([
            ['Kategori', (string) $standard->category],
            ['Periode', $effectivePeriod],
            ['Nomor Dokumen', $documentCode],
            ['Referensi Regulasi', (string) ($standard->referensi_regulasi ?: '-')],
        ] as [$label, $value]) {
            $meta->addRow();
            $meta->addCell(2500, $cellStyle)->addText($label, ['bold' => true]);
            $meta->addCell(7000, $cellStyle)->addText((string) $value);
        }

        $section->addTextBreak();
        $section->addText('ISI DOKUMEN', ['bold' => true, 'size' => 12]);
        $this->headerCounter = 0;
        $this->statementCounter = 0;
        if ($tree->isEmpty()) {
            $section->addText('-');
        } else {
            $this->renderNativeTree($section, $tree->all());
        }

        $section->addTextBreak();
        $this->addApprovalTable($section, $standard, $borderedTable);
        $section->addTextBreak();
        $section->addText(
            'Dokumen ini dibangun dari data standar terbaru di sistem. Perubahan pada informasi dan struktur standar tercermin pada hasil ekspor.',
            ['italic' => true, 'size' => 9],
            ['alignment' => Jc::BOTH]
        );
    }

    private function addProcessTable(mixed $section, array $tableStyle): void
    {
        $table = $section->addTable($tableStyle);
        $headers = ['Proses', 'Penanggung Jawab', 'Jabatan', 'Tanda Tangan'];
        $table->addRow();
        foreach ($headers as $header) {
            $table->addCell(2400, ['bgColor' => 'D9E2F3', 'valign' => VerticalJc::CENTER])
                ->addText($header, ['bold' => true], ['alignment' => Jc::CENTER]);
        }

        foreach ([
            ['Perumusan', 'Tim Perumus', 'Perumus Standar'],
            ['Pemeriksaan', 'Tim Pemeriksa', 'Pemeriksa Standar'],
            ['Persetujuan', 'Pimpinan Unit', 'Pemberi Persetujuan'],
            ['Penetapan', 'Rektor', 'Penetap Standar'],
        ] as $row) {
            $table->addRow(750);
            foreach ($row as $value) {
                $table->addCell(2400, ['valign' => VerticalJc::CENTER])->addText($value);
            }
            $table->addCell(2400, ['valign' => VerticalJc::CENTER])->addText('');
        }
    }

    /**
     * @param array<int, MstMetric> $nodes
     */
    private function renderNativeTree(mixed $section, array $nodes, int $depth = 0): void
    {
        foreach ($nodes as $node) {
            $prefix = '';
            $fontStyle = ['size' => 11];

            if ($node->type === 'Header') {
                $prefix = ++$this->headerCounter . '. ';
                $this->statementCounter = 0;
                $fontStyle['bold'] = true;
            } elseif ($node->type === 'Statement') {
                $prefix = $this->toAlpha(++$this->statementCounter) . '. ';
                $fontStyle['bold'] = true;
            }

            $paragraphStyle = [
                'alignment' => Jc::BOTH,
                'indentation' => ['left' => $depth * 360],
                'spaceAfter' => 100,
            ];
            $nodeContent = $this->stripExistingNodePrefix((string) $node->content, (string) $node->type);

            if (($node->content_format ?? null) === 'TABLE') {
                if ($prefix !== '') {
                    $section->addText($prefix, $fontStyle, $paragraphStyle);
                }
                $this->addStructuredTable($section, (string) $node->content, $depth);
            } else {
                $section->addText($prefix . $nodeContent, $fontStyle, $paragraphStyle);
            }

            if ($node->childrenRecursive->isNotEmpty()) {
                $this->renderNativeTree($section, $node->childrenRecursive->all(), $depth + 1);
            }
        }
    }

    private function stripExistingNodePrefix(string $content, string $type): string
    {
        return match ($type) {
            'Header' => preg_replace('/^\s*\d+\s*[.)]\s*/u', '', $content) ?? $content,
            'Statement' => preg_replace('/^\s*[a-z]\s*[.)]\s*/iu', '', $content) ?? $content,
            default => $content,
        };
    }

    private function addStructuredTable(mixed $section, string $content, int $depth): void
    {
        $tableData = $this->parseStructuredTable($content);
        $indent = $depth * 360;

        if ($tableData['intro_text'] !== '') {
            $section->addText(
                $tableData['intro_text'],
                [],
                ['alignment' => Jc::BOTH, 'indentation' => ['left' => $indent], 'spaceAfter' => 100]
            );
        }

        $table = $section->addTable([
            'borderSize' => 8,
            'borderColor' => '000000',
            'cellMargin' => 90,
        ]);
        $columnCount = max(1, count($tableData['headers']));
        $cellWidth = (int) floor(9500 / $columnCount);

        $table->addRow();
        foreach ($tableData['headers'] as $header) {
            $table->addCell($cellWidth, ['bgColor' => 'D9E2F3', 'valign' => VerticalJc::CENTER])
                ->addText($header ?: '-', ['bold' => true], ['alignment' => Jc::CENTER]);
        }

        foreach ($tableData['rows'] as $row) {
            $table->addRow();
            foreach ($tableData['headers'] as $index => $_header) {
                $table->addCell($cellWidth, ['valign' => VerticalJc::CENTER])
                    ->addText((string) ($row[$index] ?? '-'));
            }
        }

        if ($tableData['table_note'] !== '') {
            $section->addText(
                $tableData['table_note'],
                ['italic' => true, 'size' => 9],
                ['indentation' => ['left' => $indent], 'spaceBefore' => 80, 'spaceAfter' => 100]
            );
        }
    }

    /**
     * @return array{intro_text: string, table_note: string, headers: array<int, string>, rows: array<int, array<int, string>>}
     */
    private function parseStructuredTable(string $content): array
    {
        $decoded = json_decode($content, true);
        if (! is_array($decoded)) {
            return [
                'intro_text' => '',
                'table_note' => '',
                'headers' => ['Kolom 1'],
                'rows' => [[$content]],
            ];
        }

        if (($decoded['kind'] ?? null) === 'SINGLE_COLUMN_TABLE') {
            return [
                'intro_text' => '',
                'table_note' => '',
                'headers' => [(string) ($decoded['column_name'] ?? 'Kolom 1')],
                'rows' => [[(string) ($decoded['value'] ?? '')]],
            ];
        }

        $headers = array_values(array_map(
            fn (mixed $value): string => (string) $value,
            is_array($decoded['headers'] ?? null) && $decoded['headers'] !== [] ? $decoded['headers'] : ['Kolom 1']
        ));
        $rows = [];
        foreach (is_array($decoded['rows'] ?? null) ? $decoded['rows'] : [] as $row) {
            $row = is_array($row) ? $row : [$row];
            $rows[] = array_map(
                fn (int $index): string => (string) ($row[$index] ?? ''),
                array_keys($headers)
            );
        }

        return [
            'intro_text' => (string) ($decoded['intro_text'] ?? ''),
            'table_note' => (string) ($decoded['table_note'] ?? ''),
            'headers' => $headers,
            'rows' => $rows !== [] ? $rows : [array_fill(0, count($headers), '')],
        ];
    }

    private function addApprovalTable(mixed $section, MstStandard $standard, array $tableStyle): void
    {
        $section->addText('TABEL PERSETUJUAN', ['bold' => true, 'size' => 12]);
        $table = $section->addTable($tableStyle);
        $table->addRow();
        foreach (['Peran', 'Disetujui Pada', 'Tanda Tangan'] as $header) {
            $table->addCell(3200, ['bgColor' => 'D9E2F3', 'valign' => VerticalJc::CENTER])
                ->addText($header, ['bold' => true], ['alignment' => Jc::CENTER]);
        }

        foreach ([
            ['Kepala LPMI', $standard->head_lpmi_approved_at?->format('d F Y H:i')],
            $this->getWrApprovalRow($standard),
            ['Rektor', $standard->rector_approved_at?->format('d F Y H:i')],
        ] as [$role, $approvedAt]) {
            $table->addRow(750);
            $table->addCell(3200, ['valign' => VerticalJc::CENTER])->addText($role);
            $table->addCell(3200, ['valign' => VerticalJc::CENTER])->addText($approvedAt ?: '-');
            $table->addCell(3200, ['valign' => VerticalJc::CENTER])->addText('');
        }
    }

    private function getTemplateFamily(MstStandard $standard): string
    {
        return match ($standard->category) {
            'Pendidikan' => 'Template Standar Pendidikan',
            'Penelitian' => 'Template Standar Penelitian',
            'Pengabdian' => 'Template Standar Pengabdian kepada Masyarakat',
            default => 'Template Standar Mutu Institusi',
        };
    }

    private function getDocumentCode(MstStandard $standard): string
    {
        [$familyCode, $sectionCode] = match ($standard->category) {
            'Pendidikan' => ['SMP', 'II'],
            'Penelitian' => ['SMPEN', 'III'],
            'Pengabdian' => ['SMPKM', 'IV'],
            default => ['SMI', 'V'],
        };

        $tailCode = $this->guessTailCodeFromName($standard->name);

        return sprintf('SPMI-UIM/%s/%s/%s', $familyCode, $sectionCode, $tailCode);
    }

    private function guessTailCodeFromName(string $name): string
    {
        $normalized = mb_strtoupper($name);
        $map = [
            'KOMPETENSI LULUSAN' => 'A',
            'ISI PEMBELAJARAN' => 'B',
            'PROSES PEMBELAJARAN' => 'C',
            'PENILAIAN PEMBELAJARAN' => 'D',
            'DOSEN DAN TENAGA KEPENDIDIKAN' => 'E',
            'DOSEN' => 'E',
            'TENDIK' => 'E',
            'SARANA' => 'F',
            'PRASARANA' => 'F',
            'PENGELOLAAN PEMBELAJARAN' => 'G',
            'PEMBIAYAAN PEMBELAJARAN' => 'H',
        ];

        foreach ($map as $needle => $code) {
            if (str_contains($normalized, $needle)) {
                return $code;
            }
        }

        return 'A';
    }

    private function buildProcessRows(MstStandard $standard): string
    {
        $rows = [
            ['Perumusan', 'Tim Perumus', 'Perumus Standar', ''],
            ['Pemeriksaan', 'Tim Pemeriksa', 'Pemeriksa Standar', ''],
            ['Persetujuan', 'Pimpinan Unit', 'Pemberi Persetujuan', ''],
            ['Penetapan', 'Rektor', 'Penetap Standar', ''],
        ];

        return collect($rows)->map(function (array $row): string {
            return sprintf(
                '<tr><td>%s</td><td>%s</td><td>%s</td><td class="signature-space"></td></tr>',
                $this->escape($row[0]),
                $this->escape($row[1]),
                $this->escape($row[2]),
            );
        })->implode('');
    }

    private function getWrApprovalRow(MstStandard $standard): array
    {
        return match ($standard->category) {
            'Pendidikan' => ['Wakil Rektor 3', $standard->wr3_approved_at?->format('d F Y H:i')],
            'Penelitian' => ['Wakil Rektor 2', $standard->wr2_approved_at?->format('d F Y H:i')],
            default => ['Wakil Rektor 1', $standard->wr1_approved_at?->format('d F Y H:i')],
        };
    }

    public function buildWordHtml(MstStandard $standard): string
    {
        $standard->loadMissing('metrics');
        $this->headerCounter = 0;
        $this->statementCounter = 0;

        $tree = MstMetric::where('standard_id', $standard->id)
            ->whereNull('parent_id')
            ->orderBy('order')
            ->with('childrenRecursive')
            ->get();

        $contentHtml = $this->renderTree($tree->all());
        $approvalRows = $this->buildApprovalRows($standard);
        $templateFamily = $this->getTemplateFamily($standard);
        $documentCode = $this->getDocumentCode($standard);
        $effectivePeriod = $standard->periode_tahun
            ? sprintf('%s / %s', $standard->periode_tahun, (int) $standard->periode_tahun + 1)
            : '-';
        $revisionNumber = $standard->revision_number ?? 0;
        $documentDate = $standard->rector_approved_at?->format('d F Y')
            ?: $standard->updated_at?->format('d F Y')
            ?: now()->format('d F Y');
        $pageRange = '1-' . max(1, $tree->count() + 3);
        $processRows = $this->buildProcessRows($standard);

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{$this->escape($standard->name)}</title>
    <style>
        @page { margin: 2.2cm 2cm; }
        body { font-family: 'Times New Roman', serif; color: #111827; font-size: 12pt; line-height: 1.65; }
        h1, h2, h3, p { margin: 0; }
        .document-shell { border: 1px solid #111827; }
        .document-header { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .document-header td { border: 1px solid #111827; vertical-align: middle; padding: 8px; }
        .document-header .logo-cell { width: 84px; text-align: center; font-size: 11pt; font-weight: bold; }
        .document-header .identity-cell { text-align: center; }
        .document-header .identity-top { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
        .document-header .identity-main { margin-top: 6px; font-size: 16pt; font-weight: bold; text-transform: uppercase; }
        .document-header .identity-sub { margin-top: 4px; font-size: 11pt; }
        .document-header .control-cell { width: 220px; padding: 0; }
        .control-table { width: 100%; border-collapse: collapse; }
        .control-table td { border: 1px solid #111827; padding: 6px 8px; font-size: 10pt; }
        .control-table .label { width: 90px; font-weight: bold; }
        .document-title { text-align: center; margin: 0 0 18px; }
        .document-title .template-family { font-size: 11pt; text-transform: uppercase; font-weight: bold; }
        .document-title .title { margin-top: 8px; font-size: 15pt; font-weight: bold; text-transform: uppercase; }
        .document-title .period { margin-top: 4px; font-size: 11pt; }
        .process-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .process-table th, .process-table td { border: 1px solid #374151; padding: 8px; vertical-align: top; text-align: left; }
        .process-table th { background: #eef2f7; text-align: center; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
        .meta-table td { padding: 3px 0; vertical-align: top; }
        .meta-table .meta-label { width: 170px; font-weight: bold; }
        .section-title { margin: 24px 0 12px; font-size: 13pt; font-weight: bold; text-transform: uppercase; }
        .intro { margin-bottom: 16px; text-align: justify; }
        .node { margin-bottom: 12px; text-align: justify; }
        .node-header { font-weight: bold; }
        .node-statement { font-weight: bold; }
        .node-indicator { margin-left: 32px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #374151; padding: 8px; vertical-align: top; text-align: left; }
        th { background: #e5e7eb; }
        .signature-space { height: 64px; }
        .closing { margin-top: 24px; text-align: justify; }
        .approval-notes { margin-top: 16px; font-size: 10.5pt; }
    </style>
</head>
<body>
    <table class="document-header">
        <tr>
            <td class="logo-cell">E-SPMI</td>
            <td class="identity-cell">
                <div class="identity-top">Sistem Penjaminan Mutu Internal</div>
                <div class="identity-main">Dokumen Standar Mutu</div>
                <div class="identity-sub">Universitas Islam Madura</div>
            </td>
            <td class="control-cell">
                <table class="control-table">
                    <tr>
                        <td class="label">Kode</td>
                        <td>{$this->escape($documentCode)}</td>
                    </tr>
                    <tr>
                        <td class="label">Tanggal</td>
                        <td>{$this->escape($documentDate)}</td>
                    </tr>
                    <tr>
                        <td class="label">Status</td>
                        <td>{$this->escape((string) $standard->status)}</td>
                    </tr>
                    <tr>
                        <td class="label">Revisi</td>
                        <td>{$this->escape((string) $revisionNumber)}</td>
                    </tr>
                    <tr>
                        <td class="label">Halaman</td>
                        <td>{$this->escape($pageRange)}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="document-title">
        <div class="template-family">Standar SPMI</div>
        <div class="title">{$this->escape($standard->name)}</div>
        <div class="period">Periode {$this->escape($effectivePeriod)}</div>
    </div>

    <table class="process-table">
        <thead>
            <tr>
                <th>Proses</th>
                <th>Penanggung Jawab</th>
                <th>Jabatan</th>
                <th>Tanda Tangan</th>
            </tr>
        </thead>
        <tbody>
            {$processRows}
        </tbody>
    </table>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Kategori</td>
            <td>: {$this->escape($standard->category)}</td>
        </tr>
        <tr>
            <td class="meta-label">Periode</td>
            <td>: {$this->escape($effectivePeriod)}</td>
        </tr>
        <tr>
            <td class="meta-label">Nomor Dokumen</td>
            <td>: {$this->escape($documentCode)}</td>
        </tr>
        <tr>
            <td class="meta-label">Referensi Regulasi</td>
            <td>: {$this->escape((string) ($standard->referensi_regulasi ?: '-'))}</td>
        </tr>
        <tr>
            <td class="meta-label">Sumber Template</td>
            <td>: {$this->escape($templateFamily)} (mengikuti pola dokumen referensi di folder documents)</td>
        </tr>
    </table>

    <p class="intro">
        Dokumen ini merupakan hasil ekspor standar mutu yang disusun manual melalui sistem E-SPMI. Struktur dan tata letaknya diselaraskan dengan template dokumen standar yang tersedia pada folder referensi dokumen, sehingga keluaran manual tetap mengikuti format dokumen mutu yang konsisten.
    </p>

    <div class="section-title">Isi Dokumen</div>
    {$contentHtml}

    <div class="section-title">Tabel Persetujuan</div>
    <table>
        <thead>
            <tr>
                <th>Peran</th>
                <th>Disetujui Pada</th>
                <th>Tanda Tangan</th>
            </tr>
        </thead>
        <tbody>
            {$approvalRows}
        </tbody>
    </table>

    <p class="approval-notes">
        Catatan: dokumen ini dibangun dari data standar terbaru di sistem. Perubahan pada informasi dan struktur standar akan tercermin pada setiap hasil ekspor.
    </p>

    <p class="closing">
        Dokumen ini dihasilkan secara otomatis dari sistem dan digunakan sebagai salinan ekspor resmi untuk kebutuhan distribusi, pembacaan, dan arsip.
    </p>
</body>
</html>
HTML;
    }

    /**
     * @param array<int, MstMetric> $nodes
     */
    private function renderTree(array $nodes, int $depth = 0): string
    {
        $html = '';

        foreach ($nodes as $node) {
            $content = nl2br($this->escape((string) $node->content));
            $labelPrefix = '';
            $className = 'node-indicator';

            if ($node->type === 'Header') {
                $this->headerCounter++;
                $this->statementCounter = 0;
                $labelPrefix = $this->headerCounter . '. ';
                $className = 'node-header';
            } elseif ($node->type === 'Statement') {
                $labelPrefix = $this->toAlpha(++$this->statementCounter) . '. ';
                $className = 'node-statement';
            }

            $marginLeft = $depth * 24;

            $html .= sprintf(
                '<div class="node %s" style="margin-left:%dpx;">%s</div>',
                $className,
                $marginLeft,
                ($content !== '' ? $labelPrefix . $content : $labelPrefix . '&nbsp;')
            );

            if ($node->childrenRecursive->isNotEmpty()) {
                $html .= $this->renderTree($node->childrenRecursive->all(), $depth + 1);
            }
        }

        return $html !== '' ? $html : '<p>-</p>';
    }

    private function buildApprovalRows(MstStandard $standard): string
    {
        $rows = [
            ['Kepala LPMI', $standard->head_lpmi_approved_at?->format('d F Y H:i')],
            $this->getWrApprovalRow($standard),
            ['Rektor', $standard->rector_approved_at?->format('d F Y H:i')],
        ];

        return collect($rows)->map(function (array $row): string {
            return sprintf(
                '<tr><td>%s</td><td>%s</td><td class="signature-space"></td></tr>',
                $this->escape($row[0]),
                $this->escape($row[1] ?: '-')
            );
        })->implode('');
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private function toAlpha(int $index): string
    {
        $result = '';

        while ($index > 0) {
            $index--;
            $result = chr(97 + ($index % 26)) . $result;
            $index = intdiv($index, 26);
        }

        return $result;
    }
}
