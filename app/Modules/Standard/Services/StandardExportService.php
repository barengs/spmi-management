<?php

namespace App\Modules\Standard\Services;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;

class StandardExportService
{
    public function buildWordHtml(MstStandard $standard): string
    {
        $standard->loadMissing('metrics');

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
        body { font-family: Arial, sans-serif; color: #111827; font-size: 12pt; line-height: 1.6; }
        h1, h2, h3, p { margin: 0 0 12px; }
        .meta { margin-bottom: 24px; }
        .meta p { margin-bottom: 6px; }
        .section-title { margin: 28px 0 12px; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .node { margin-bottom: 12px; }
        .node-header { font-weight: bold; }
        .node-statement { font-weight: bold; }
        .node-indicator { margin-left: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #374151; padding: 8px; vertical-align: top; text-align: left; }
        th { background: #e5e7eb; }
        .signature-space { height: 56px; }
    </style>
</head>
<body>
    <h1>{$this->escape($standard->name)}</h1>
    <div class="meta">
        <p><strong>Kategori:</strong> {$this->escape($standard->category)}</p>
        <p><strong>Periode:</strong> {$this->escape((string) ($standard->periode_tahun ?? '-'))}</p>
        <p><strong>Status:</strong> {$this->escape((string) $standard->status)}</p>
        <p><strong>Referensi Regulasi:</strong> {$this->escape((string) ($standard->referensi_regulasi ?: '-'))}</p>
    </div>

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
            $className = match ($node->type) {
                'Header' => 'node-header',
                'Statement' => 'node-statement',
                default => 'node-indicator',
            };
            $marginLeft = $depth * 24;

            $html .= sprintf(
                '<div class="node %s" style="margin-left:%dpx;">%s</div>',
                $className,
                $marginLeft,
                $content !== '' ? $content : '&nbsp;'
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
            ['Wakil Rektor 1', $standard->wr1_approved_at?->format('d F Y H:i')],
            ['Wakil Rektor 2', $standard->wr2_approved_at?->format('d F Y H:i')],
            ['Wakil Rektor 3', $standard->wr3_approved_at?->format('d F Y H:i')],
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
}
