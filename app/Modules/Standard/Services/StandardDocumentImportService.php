<?php

namespace App\Modules\Standard\Services;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Process;
use Illuminate\Validation\ValidationException;

class StandardDocumentImportService
{
    private const MAJOR_SECTION_PATTERNS = [
        '/^visi dan misi$/iu',
        '/^rasionalisasi\b/iu',
        '/^pihak yang bertanggungjawab\b/iu',
        '/^definisi istilah$/iu',
        '/^pernyataan isi standar\b/iu',
        '/^proses ppepp\b/iu',
        '/^strategi pelaksanaan\b/iu',
        '/^indikator ketercapaian\b/iu',
        '/^dokumen terkait\b/iu',
        '/^referensi$/iu',
    ];

    private const MINOR_SECTION_PATTERNS = [
        '/^visi$/iu',
        '/^misi$/iu',
        '/^tujuan\s*:?\s*$/iu',
        '/^sasaran\s*:?\s*$/iu',
        '/^penetapan standar$/iu',
        '/^pelaksanaan standar$/iu',
        '/^evaluasi standar$/iu',
        '/^pengendalian standar$/iu',
        '/^peningkatan standar$/iu',
    ];

    public function import(MstStandard $standard, ?array $structureTree = null, ?string $extractedText = null): array
    {
        if (! $structureTree && ! $extractedText) {
            ['structure_tree' => $structureTree, 'extracted_text' => $extractedText] = $this->extractFromStoredDocument($standard);
        }

        $nodes = $structureTree ?: $this->buildTreeFromExtractedText($extractedText);

        if (empty($nodes)) {
            throw ValidationException::withMessages([
                'document' => 'Struktur standar tidak berhasil dibaca dari dokumen yang diunggah. Pastikan PDF memiliki text layer yang dapat diekstrak.',
            ]);
        }

        return DB::transaction(function () use ($standard, $nodes) {
            $standard->metrics()->delete();

            $created = $this->persistNodes($standard->id, $nodes);

            return [
                'root_count' => count($nodes),
                'node_count' => $created,
            ];
        });
    }

    private function extractFromStoredDocument(MstStandard $standard): array
    {
        if (! $standard->source_document_path) {
            throw ValidationException::withMessages([
                'document' => 'Dokumen sumber standar tidak ditemukan.',
            ]);
        }

        $process = Process::path(base_path())
            ->run([
                'node',
                base_path('scripts/extract-standard-pdf.mjs'),
                Storage::disk('local')->path($standard->source_document_path),
            ]);

        if ($process->failed()) {
            throw ValidationException::withMessages([
                'document' => 'Dokumen gagal diproses otomatis. Pastikan PDF memiliki text layer yang dapat dibaca sistem.',
            ]);
        }

        $decoded = json_decode($process->output(), true);

        if (! is_array($decoded)) {
            throw ValidationException::withMessages([
                'document' => 'Hasil pembacaan dokumen tidak valid.',
            ]);
        }

        return [
            'structure_tree' => Arr::get($decoded, 'structure_tree', []),
            'extracted_text' => Arr::get($decoded, 'extracted_text'),
        ];
    }

    public function buildTreeFromExtractedText(?string $text): array
    {
        $normalized = $this->normalizeText($text);

        if ($normalized === '') {
            return [];
        }

        $lines = collect(preg_split('/\R/u', $normalized))
            ->map(fn (string $line) => trim($line))
            ->filter()
            ->pipe(fn ($collection) => $this->cropToStandardBody($collection))
            ->values();

        $tree = [];
        $currentHeaderIndex = null;
        $currentStatementIndex = null;
        $paragraphBuffer = [];
        $activeListItemIndex = null;

        $flushParagraphBuffer = function () use (&$paragraphBuffer, &$tree, &$currentHeaderIndex, &$currentStatementIndex, &$activeListItemIndex): void {
            if (empty($paragraphBuffer) || $currentHeaderIndex === null || $currentStatementIndex === null) {
                $paragraphBuffer = [];
                return;
            }

            $content = trim(implode(' ', $paragraphBuffer));
            if ($content !== '') {
                $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][] = $this->makeNode('Indicator', $content);
            }

            $paragraphBuffer = [];
            $activeListItemIndex = null;
        };

        $ensureStatementNode = function () use (&$tree, &$currentHeaderIndex, &$currentStatementIndex): bool {
            if ($currentHeaderIndex === null) {
                return false;
            }

            if ($currentStatementIndex !== null) {
                return true;
            }

            $tree[$currentHeaderIndex]['children'][] = $this->makeNode('Statement', 'Uraian');
            $currentStatementIndex = array_key_last($tree[$currentHeaderIndex]['children']);

            return true;
        };

        foreach ($lines as $line) {
            if ($this->shouldSkipLine($line)) {
                continue;
            }

            if ($this->isHeaderLine($line) || $this->isMajorSectionLine($line)) {
                $flushParagraphBuffer();
                $tree[] = $this->makeNode('Header', $this->cleanSectionLabel($line));
                $currentHeaderIndex = array_key_last($tree);
                $currentStatementIndex = null;
                $activeListItemIndex = null;
                continue;
            }

            if ($this->isStatementLine($line) || $this->isMinorSectionLine($line)) {
                $flushParagraphBuffer();
                if ($currentHeaderIndex === null) {
                    continue;
                }
                $tree[$currentHeaderIndex]['children'][] = $this->makeNode('Statement', $this->cleanSectionLabel($line));
                $currentStatementIndex = array_key_last($tree[$currentHeaderIndex]['children']);
                $activeListItemIndex = null;
                continue;
            }

            if ($this->isContentListLine($line)) {
                $flushParagraphBuffer();
                if (! $ensureStatementNode()) {
                    continue;
                }
                $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][] = $this->makeNode('Indicator', $line);
                $activeListItemIndex = array_key_last($tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children']);
                continue;
            }

            if ($currentHeaderIndex === null) {
                continue;
            }

            if ($activeListItemIndex !== null) {
                $current = $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][$activeListItemIndex]['content'] ?? '';
                $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][$activeListItemIndex]['content'] = trim($current . ' ' . $line);
                continue;
            }

            if (! $ensureStatementNode()) {
                continue;
            }

            if (! empty($paragraphBuffer) && ! $this->shouldContinueParagraph(end($paragraphBuffer), $line)) {
                $flushParagraphBuffer();
            }

            $paragraphBuffer[] = $line;
        }

        $flushParagraphBuffer();

        return $this->filterEmptyNodes($tree);
    }

    private function normalizeText(?string $text): string
    {
        if ($text === null) {
            return '';
        }

        $normalized = preg_replace('/[ \t]+/u', ' ', $text) ?? '';
        $normalized = preg_replace('/\n{3,}/u', "\n\n", $normalized) ?? '';

        return trim($normalized);
    }

    private function isHeaderLine(string $line): bool
    {
        return (bool) preg_match('/^[0-9]+\.\s+\S+/u', $line);
    }

    private function isStatementLine(string $line): bool
    {
        return (bool) preg_match('/^[A-Za-z]\.\s+\S+/u', $line);
    }

    private function isContentListLine(string $line): bool
    {
        return (bool) preg_match('/^[0-9]+\)\s+\S+/u', $line);
    }

    private function isMajorSectionLine(string $line): bool
    {
        foreach (self::MAJOR_SECTION_PATTERNS as $pattern) {
            if (preg_match($pattern, trim($line))) {
                return true;
            }
        }

        return false;
    }

    private function isMinorSectionLine(string $line): bool
    {
        foreach (self::MINOR_SECTION_PATTERNS as $pattern) {
            if (preg_match($pattern, trim($line))) {
                return true;
            }
        }

        return false;
    }

    private function cleanSectionLabel(string $line): string
    {
        $normalized = preg_replace('/^[A-Za-z]\.\s+/u', '', $line) ?? $line;
        $normalized = preg_replace('/^[0-9]+\.\s+/u', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s*:\s*$/u', '', $normalized) ?? $normalized;

        return trim($normalized);
    }

    private function makeNode(string $type, string $content): array
    {
        return [
            'type' => $type,
            'content' => trim($content),
            'children' => [],
        ];
    }

    private function shouldSkipLine(string $line): bool
    {
        return (bool) preg_match(
            '/^(Standar SPMI Universitas Islam Madura\b.*|No Isi Halaman|Universitas Islam Madura|Halaman\s*:.*|Kode\s*:.*|Tanggal\s*:.*|Revisi\s*:.*|Alamat:.*|www\..*|Proses|Penanggung Jawab|Tanda Tangan|Nama|Jabatan|\d+|[\-–]?\d[\d\-]{4,})$/iu',
            trim($line)
        );
    }

    private function cropToStandardBody($lines)
    {
        $majorSectionIndex = $lines->search(fn (string $line) => $this->isMajorSectionLine($line));

        if ($majorSectionIndex !== false) {
            return $lines->slice($majorSectionIndex)->values();
        }

        $numberedHeaderIndex = $lines->search(function (string $line, int $index) use ($lines) {
            if (! $this->isHeaderLine($line)) {
                return false;
            }

            return $lines->slice($index + 1, 5)->contains(fn (string $candidate) => $this->isStatementLine($candidate));
        });

        if ($numberedHeaderIndex !== false) {
            return $lines->slice($numberedHeaderIndex)->values();
        }

        return $lines;
    }

    private function shouldContinueParagraph(string $previousLine, string $currentLine): bool
    {
        $previousLine = trim($previousLine);
        $currentLine = trim($currentLine);

        if ($previousLine === '' || $currentLine === '') {
            return false;
        }

        if (preg_match('/[,:]\s*$/u', $previousLine)) {
            return true;
        }

        if (! preg_match('/[.!?;:]$/u', $previousLine)) {
            return true;
        }

        if (preg_match('/^[a-z(]/u', $currentLine)) {
            return true;
        }

        return (bool) preg_match('/^(dan|atau|serta|yang|untuk|dengan|dalam|pada|sebagai|agar|oleh|terhadap|melalui)\b/iu', $currentLine);
    }

    private function filterEmptyNodes(array $nodes): array
    {
        return array_values(array_filter(array_map(function (array $node) {
            $node['children'] = $this->filterEmptyNodes($node['children'] ?? []);

            if ($node['type'] === 'Indicator') {
                return blank($node['content']) ? null : $node;
            }

            if (blank($node['content']) && empty($node['children'])) {
                return null;
            }

            return $node;
        }, $nodes)));
    }

    private function persistNodes(int $standardId, array $nodes, ?int $parentId = null): int
    {
        $created = 0;

        foreach (array_values($nodes) as $index => $node) {
            $metric = MstMetric::create([
                'standard_id' => $standardId,
                'parent_id' => $parentId,
                'content' => trim((string) Arr::get($node, 'content')),
                'type' => Arr::get($node, 'type', 'Indicator'),
                'pj' => null,
                'order' => $index + 1,
                'review_status' => 'ACCEPTED',
            ]);

            $created++;
            $created += $this->persistNodes($standardId, Arr::get($node, 'children', []), $metric->id);
        }

        return $created;
    }
}
