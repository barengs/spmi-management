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

        foreach ($lines as $line) {
            if ($this->shouldSkipLine($line)) {
                continue;
            }

            if ($this->isHeaderLine($line)) {
                $flushParagraphBuffer();
                $tree[] = $this->makeNode('Header', $line);
                $currentHeaderIndex = array_key_last($tree);
                $currentStatementIndex = null;
                $activeListItemIndex = null;
                continue;
            }

            if ($this->isStatementLine($line)) {
                $flushParagraphBuffer();
                if ($currentHeaderIndex === null) {
                    continue;
                }
                $tree[$currentHeaderIndex]['children'][] = $this->makeNode('Statement', $line);
                $currentStatementIndex = array_key_last($tree[$currentHeaderIndex]['children']);
                $activeListItemIndex = null;
                continue;
            }

            if ($this->isContentListLine($line)) {
                $flushParagraphBuffer();
                if ($currentHeaderIndex === null || $currentStatementIndex === null) {
                    continue;
                }
                $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][] = $this->makeNode('Indicator', $line);
                $activeListItemIndex = array_key_last($tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children']);
                continue;
            }

            if ($currentHeaderIndex === null || $currentStatementIndex === null) {
                continue;
            }

            if ($activeListItemIndex !== null) {
                $current = $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][$activeListItemIndex]['content'] ?? '';
                $tree[$currentHeaderIndex]['children'][$currentStatementIndex]['children'][$activeListItemIndex]['content'] = trim($current . ' ' . $line);
                continue;
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
        return (bool) preg_match('/^(Standar SPMI Universitas Islam Madura\b.*|No Isi Halaman)$/i', trim($line));
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
