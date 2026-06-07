<?php

namespace App\Modules\Standard\Services;

use App\Modules\Standard\Models\MstMetric;
use App\Modules\Standard\Models\MstStandard;
use App\Modules\Standard\Models\MstStandardIndicator;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpWord\IOFactory;
use ZipArchive;

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

    public function refreshMetadataFromSource(MstStandard $standard): array
    {
        $documentData = $this->extractFromStoredDocument($standard);
        $metadata = Arr::except(Arr::get($documentData, 'metadata', []), ['indicator_entries']);

        $standard->forceFill($metadata)->save();

        return $metadata;
    }

    public function import(MstStandard $standard, ?array $structureTree = null, ?string $extractedText = null): array
    {
        $documentData = ['metadata' => []];

        try {
            $documentData = $this->extractFromStoredDocument($standard);
        } catch (ValidationException $exception) {
            $documentData = ['metadata' => []];
        }

        if (! $structureTree && ! $extractedText) {
            $structureTree = Arr::get($documentData, 'structure_tree');
            $extractedText = Arr::get($documentData, 'extracted_text');
        }

        if ($extractedText) {
            $documentData['metadata'] = array_filter(
                array_merge(
                    Arr::get($documentData, 'metadata', []),
                    $this->extractMetadataFromText($extractedText)
                ),
                fn ($value) => $value !== null
            );
        }

        $nodes = $structureTree ?: $this->buildTreeFromExtractedText($extractedText);

        if (empty($nodes)) {
            return DB::transaction(function () use ($standard) {
                $standard->forceFill([
                    'standard_code' => null,
                    'document_date' => null,
                    'revision_number' => null,
                    'page_count' => null,
                    'iku_count' => null,
                    'ikt_count' => null,
                    'indicator_entries' => null,
                ])->save();
                $standard->metrics()->delete();
                $standard->indicators()->delete();

                return [
                    'root_count' => 0,
                    'node_count' => 0,
                    'document_only' => true,
                ];
            });
        }

        return DB::transaction(function () use ($standard, $nodes, $documentData) {
            $standard->forceFill(Arr::get($documentData, 'metadata', []))->save();
            $standard->metrics()->delete();
            $standard->indicators()->delete();

            $created = $this->persistNodes($standard->id, $nodes);
            $this->persistIndicatorEntries($standard, Arr::get($documentData, 'metadata.indicator_entries', []));

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

        $absolutePath = Storage::disk('local')->path($standard->source_document_path);
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));

        if ($extension !== 'docx') {
            throw ValidationException::withMessages([
                'document' => 'Format dokumen tidak didukung. Gunakan berkas DOCX.',
            ]);
        }

        $extractedText = $this->extractTextFromDocx($absolutePath);

        return [
            'structure_tree' => $this->buildTreeFromExtractedText($extractedText),
            'extracted_text' => $extractedText,
            'metadata' => $this->extractMetadataFromText($extractedText),
        ];
    }

    private function extractMetadataFromText(string $text): array
    {
        $code = $this->extractDocumentField($text, ['Kode', 'Kode Dokumen', 'No Dokumen', 'Nomor Dokumen']);
        $documentDate = $this->extractDocumentField($text, ['Tanggal', 'Tanggal Dokumen', 'Tgl']);
        $revision = $this->extractDocumentField($text, ['Revisi', 'Rev', 'Revisi Ke']);
        $pageRange = $this->extractDocumentField($text, ['Halaman', 'Jumlah Halaman']);

        $indicatorEntries = $this->extractIndicatorEntries($text);

        return [
            'standard_code' => filled($code) ? trim($code) : null,
            'document_date' => filled($documentDate) ? trim($documentDate) : null,
            'revision_number' => $this->extractRevisionNumber($revision),
            'page_count' => $this->extractPageCount($pageRange),
            'iku_count' => $this->countIndicatorEntries($indicatorEntries, 'IKU'),
            'ikt_count' => $this->countIndicatorEntries($indicatorEntries, 'IKT'),
            'indicator_entries' => $indicatorEntries,
        ];
    }

    /**
     * @param array<int, string> $labels
     */
    private function extractDocumentField(string $text, array $labels): ?string
    {
        $labelPattern = collect($labels)
            ->sortByDesc(fn (string $label) => mb_strlen($label))
            ->map(fn (string $label) => preg_quote($label, '/'))
            ->implode('|');

        if (! preg_match('/(?:^|\b)(?:' . $labelPattern . ')\s*:?\s*([^\r\n]+)/imu', $text, $match)) {
            return null;
        }

        $value = $match[1];
        $value = preg_replace('/^[\s|:;=-]+/u', '', $value) ?? $value;
        $value = preg_replace('/[\s|:;=-]+$/u', '', $value) ?? $value;
        $value = trim($value);

        if (collect($labels)->contains(function (string $label): bool {
            $normalizedLabel = mb_strtolower($label);

            return str_contains($normalizedLabel, 'kode')
                || str_starts_with($normalizedLabel, 'no dokumen')
                || str_starts_with($normalizedLabel, 'nomor dokumen');
        })) {
            $value = preg_replace('/\s*\/\s*/u', '/', $value) ?? $value;
            $value = preg_replace('/\s+/u', '', $value) ?? $value;
        }

        return $value !== '' ? $value : null;
    }

    private function extractRevisionNumber(?string $value): ?int
    {
        if (! filled($value)) {
            return null;
        }

        return preg_match('/\d+/u', $value, $match) ? (int) $match[0] : null;
    }

    private function extractPageCount(?string $value): ?int
    {
        if (! filled($value)) {
            return null;
        }

        if (preg_match('/(\d+)\s*[-–]\s*(\d+)/u', $value, $rangeMatch)) {
            return (int) $rangeMatch[2];
        }

        if (preg_match('/\d+\s*(?:dari|of)\s*(\d+)/iu', $value, $totalMatch)) {
            return (int) $totalMatch[1];
        }

        if (preg_match_all('/\d+/u', $value, $numberMatches) && $numberMatches[0] !== []) {
            return (int) end($numberMatches[0]);
        }

        return null;
    }

    private function extractIndicatorEntries(string $text): ?array
    {
        $searchText = $this->extractIndicatorSectionText($text);
        $hasExplicitIndicatorSection = (bool) preg_match('/indikator\s+ketercapaian\s+standar\b/iu', $text);
        $entries = [];
        $seen = [];
        $currentKey = null;
        $pendingContent = [];

        foreach (preg_split('/\R/u', $searchText) ?: [] as $line) {
            $line = trim($line);

            if ($this->shouldSkipIndicatorLine($line)) {
                continue;
            }

            if (preg_match('/\b(IKU|IKT)[ \t]*(?:(?:No\.?)[ \t]*)?\.?[ \t]*(\d+(?:\.\d+)*)\b[ \t]*([^\r\n]*)/iu', $line, $match)) {
                $type = mb_strtoupper($match[1]);
                $number = trim($match[2]);
                $content = trim($match[3] ?? '');
                $content = $this->cleanIndicatorContentLine($content);
                $key = $type . '|' . $number;
                $currentKey = $key;

                if (! isset($seen[$key])) {
                    $seen[$key] = count($entries);
                    $initialContent = trim(implode(' ', array_filter([...$pendingContent, $content])));
                    $pendingContent = [];
                    $entries[] = [
                        'type' => $type,
                        'number' => $number,
                        'content' => $initialContent !== '' ? $initialContent : null,
                    ];
                    continue;
                }

                if ($content !== '') {
                    $index = $seen[$key];
                    $entries[$index]['content'] = trim(($entries[$index]['content'] ? $entries[$index]['content'] . ' ' : '') . $content);
                }

                continue;
            }

            if ($currentKey !== null && isset($seen[$currentKey])) {
                $index = $seen[$currentKey];
                $line = $this->cleanIndicatorContentLine($line);

                if ($line !== '') {
                    $entries[$index]['content'] = trim(($entries[$index]['content'] ? $entries[$index]['content'] . ' ' : '') . $line);
                }
                continue;
            }

            $line = $this->cleanIndicatorContentLine($line);
            if ($hasExplicitIndicatorSection && $line !== '') {
                $pendingContent[] = $line;
            }
        }

        return empty($entries) ? null : array_map(
            fn (array $entry) => [
                'type' => $entry['type'],
                'number' => $entry['number'],
                'content' => filled($entry['content'] ?? null) ? $entry['content'] : null,
            ],
            array_values($entries)
        );
    }

    private function shouldSkipIndicatorLine(string $line): bool
    {
        if ($line === '') {
            return true;
        }

        return (bool) preg_match('/^(no|sumber|indikator|no\s+sumber\s+indikator|\d+|[-–]+)$/iu', $line)
            || (bool) preg_match('/indikator\s+ketercapaian\s+standar/iu', $line);
    }

    private function cleanIndicatorContentLine(string $line): string
    {
        $line = trim($line);
        $line = preg_replace('/^\d+\s+/u', '', $line) ?? $line;

        return trim($line);
    }

    private function extractIndicatorSectionText(string $text): string
    {
        if (! preg_match_all('/indikator\s+ketercapaian\s+standar\b/iu', $text, $matches, PREG_OFFSET_CAPTURE)) {
            return $text;
        }

        foreach (array_reverse($matches[0]) as $match) {
            $sectionText = substr($text, $match[1]);

            if (! preg_match('/\b(IKU|IKT)[ \t]*(?:(?:No\.?)[ \t]*)?\.?[ \t]*\d+(?:\.\d+)*/iu', $sectionText)) {
                continue;
            }

            if (preg_match('/\R\s*(?:\d+\.\s*)?(?:dokumen terkait|referensi)\b/iu', $sectionText, $nextMatch, PREG_OFFSET_CAPTURE, strlen($match[0]))) {
                return substr($sectionText, 0, $nextMatch[0][1]);
            }

            return $sectionText;
        }

        return $text;
    }

    private function countIndicatorEntries(?array $entries, string $type): ?int
    {
        $count = collect($entries ?: [])->where('type', $type)->count();

        return $count > 0 ? $count : null;
    }

    private function persistIndicatorEntries(MstStandard $standard, ?array $entries): void
    {
        foreach (array_values($entries ?: []) as $index => $entry) {
            MstStandardIndicator::create([
                'standard_id' => $standard->id,
                'type' => $entry['type'],
                'number' => $entry['number'],
                'content' => $entry['content'] ?? null,
                'order' => $index + 1,
            ]);
        }
    }

    private function extractTextFromDocx(string $absolutePath): string
    {
        $xmlText = $this->extractTextFromDocxXml($absolutePath);
        if ($xmlText !== '') {
            return $xmlText;
        }

        try {
            $phpWord = IOFactory::load($absolutePath, 'Word2007');
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                'document' => 'Dokumen DOCX gagal dibaca. Pastikan file tidak rusak dan memiliki teks yang dapat diekstrak.',
            ]);
        }

        $lines = [];

        foreach ($phpWord->getSections() as $section) {
            $this->collectWordElementText($section->getElements(), $lines);
        }

        return trim(implode("\n", array_filter($lines, fn (string $line) => trim($line) !== '')));
    }

    private function extractTextFromDocxXml(string $absolutePath): string
    {
        $zip = new ZipArchive();
        if ($zip->open($absolutePath) !== true) {
            return '';
        }

        $documentXml = $zip->getFromName('word/document.xml');
        $zip->close();

        if (! is_string($documentXml) || $documentXml === '') {
            return '';
        }

        $document = new DOMDocument();
        if (! @$document->loadXML($documentXml)) {
            return '';
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $body = $xpath->query('//w:body')->item(0);

        if (! $body) {
            return '';
        }

        $lines = [];

        foreach ($body->childNodes as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            if ($child->localName === 'p') {
                $text = $this->wordXmlNodeText($xpath, $child);
                if ($text !== '') {
                    $lines[] = $text;
                }
                continue;
            }

            if ($child->localName !== 'tbl') {
                continue;
            }

            foreach ($xpath->query('./w:tr', $child) as $row) {
                $cells = [];

                foreach ($xpath->query('./w:tc', $row) as $cell) {
                    $cellText = $this->wordXmlNodeText($xpath, $cell);
                    if ($cellText !== '') {
                        $cells[] = $cellText;
                    }
                }

                if ($cells !== []) {
                    $lines[] = count($cells) === 2
                        ? $cells[0] . ' : ' . $cells[1]
                        : implode(' | ', $cells);
                }
            }
        }

        return trim(implode("\n", $lines));
    }

    private function wordXmlNodeText(DOMXPath $xpath, DOMElement $node): string
    {
        $parts = [];

        foreach ($xpath->query('.//w:t', $node) as $textNode) {
            $value = trim((string) $textNode->textContent);
            if ($value !== '') {
                $parts[] = $value;
            }
        }

        return trim(preg_replace('/\s+/u', ' ', implode(' ', $parts)) ?? '');
    }

    private function collectWordElementText(array $elements, array &$lines): void
    {
        foreach ($elements as $element) {
            if (method_exists($element, 'getText')) {
                $text = trim((string) $element->getText());

                if ($text !== '') {
                    $lines[] = $text;
                }
            }

            if (method_exists($element, 'getElements')) {
                $this->collectWordElementText($element->getElements(), $lines);
            }
        }
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
            $type = Arr::get($node, 'type', 'Indicator');
            $children = Arr::get($node, 'children', []);
            $contentFormat = $children !== []
                ? ($type === 'Header' ? 'SUB_POINT' : 'INDICATOR')
                : ($type === 'Header' ? 'SUB_POINT' : 'LONG_TEXT');

            $metric = MstMetric::create([
                'standard_id' => $standardId,
                'parent_id' => $parentId,
                'content' => trim((string) Arr::get($node, 'content')),
                'type' => $type,
                'content_format' => $contentFormat,
                'pj' => null,
                'order' => $index + 1,
                'review_status' => 'ACCEPTED',
            ]);

            $created++;
            $created += $this->persistNodes($standardId, $children, $metric->id);
        }

        return $created;
    }
}
