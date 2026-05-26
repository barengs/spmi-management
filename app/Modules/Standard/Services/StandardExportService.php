<?php

namespace App\Modules\Standard\Services;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;

class StandardExportService
{
    private int $headerCounter = 0;

    private int $statementCounter = 0;

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
        .document-header { text-align: center; margin-bottom: 28px; }
        .document-header .institution { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
        .document-header .title { margin-top: 10px; font-size: 16pt; font-weight: bold; text-transform: uppercase; }
        .document-header .period { margin-top: 6px; font-size: 12pt; }
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
    </style>
</head>
<body>
    <div class="document-header">
        <div class="institution">Dokumen Standar Mutu</div>
        <div class="title">{$this->escape($standard->name)}</div>
        <div class="period">Periode {$this->escape((string) ($standard->periode_tahun ?? '-'))}</div>
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Kategori</td>
            <td>: {$this->escape($standard->category)}</td>
        </tr>
        <tr>
            <td class="meta-label">Periode</td>
            <td>: {$this->escape((string) ($standard->periode_tahun ?? '-'))}</td>
        </tr>
        <tr>
            <td class="meta-label">Status</td>
            <td>: {$this->escape((string) $standard->status)}</td>
        </tr>
        <tr>
            <td class="meta-label">Referensi Regulasi</td>
            <td>: {$this->escape((string) ($standard->referensi_regulasi ?: '-'))}</td>
        </tr>
    </table>

    <p class="intro">
        Dokumen ini merupakan hasil ekspor standar mutu yang disusun melalui sistem E-SPMI. Isi dokumen berikut menampilkan struktur standar berdasarkan poin utama, sub poin, dan isi indikator yang berlaku pada periode dokumen ini.
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
