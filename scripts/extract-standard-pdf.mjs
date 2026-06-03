import fs from 'node:fs/promises';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const [, , filePath] = process.argv;

if (!filePath) {
    console.error('PDF path is required.');
    process.exit(1);
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const normalizeText = (text) => String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const countUniqueIndicatorCodes = (text, prefix) => {
    const pattern = new RegExp(`\\b${prefix}\\s*(?:No\\.?\\s*)?\\.?\\s*\\d+(?:\\.\\d+)+`, 'gi');
    const matches = String(text || '').match(pattern) || [];
    const uniqueCodes = new Set(matches.map((value) => value.replace(/\s+/g, '').toUpperCase()));

    return uniqueCodes.size || null;
};

const buildNode = (type, content) => ({
    type,
    content: String(content || '').trim(),
    iku: null,
    ikt: null,
    children: [],
});

const majorSectionPatterns = [
    /^visi dan misi$/i,
    /^rasionalisasi\b/i,
    /^pihak yang bertanggungjawab\b/i,
    /^definisi istilah$/i,
    /^pernyataan isi standar\b/i,
    /^proses ppepp\b/i,
    /^strategi pelaksanaan\b/i,
    /^indikator ketercapaian\b/i,
    /^dokumen terkait\b/i,
    /^referensi$/i,
];

const minorSectionPatterns = [
    /^visi$/i,
    /^misi$/i,
    /^tujuan\s*:?\s*$/i,
    /^sasaran\s*:?\s*$/i,
    /^penetapan standar$/i,
    /^pelaksanaan standar$/i,
    /^evaluasi standar$/i,
    /^pengendalian standar$/i,
    /^peningkatan standar$/i,
];

const isHeaderLine = (line) => /^[0-9]+\.\s+\S+/.test(line);
const isStatementLine = (line) => /^[A-Za-z]\.\s+\S+/.test(line);
const isContentListLine = (line) => /^[0-9]+\)\s+\S+/.test(line);
const isMajorSectionLine = (line) => majorSectionPatterns.some((pattern) => pattern.test(line.trim()));
const isMinorSectionLine = (line) => minorSectionPatterns.some((pattern) => pattern.test(line.trim()));

const cleanSectionLabel = (line) => line
    .replace(/^[A-Za-z]\.\s+/u, '')
    .replace(/^[0-9]+\.\s+/u, '')
    .replace(/\s*:\s*$/u, '')
    .trim();

const shouldContinueParagraph = (previousLine, currentLine) => {
    if (!previousLine || !currentLine) {
        return false;
    }

    const prev = previousLine.trim();
    const current = currentLine.trim();

    if (!prev || !current) {
        return false;
    }

    if (/[,:]\s*$/u.test(prev)) {
        return true;
    }

    if (!/[.!?;:]$/u.test(prev)) {
        return true;
    }

    if (/^[a-z(]/u.test(current)) {
        return true;
    }

    return /^(dan|atau|serta|yang|untuk|dengan|dalam|pada|sebagai|agar|oleh|terhadap|melalui)\b/i.test(current);
};

const shouldSkipLine = (line) => {
    const normalized = line.trim();

    if (!normalized) {
        return true;
    }

    return [
        /^universitas islam madura$/i,
        /^standar spmi universitas islam madura$/i,
        /^standar spmi universitas islam madura\b.*$/i,
        /^standar mutu kemahasiswaan$/i,
        /^daftar isi$/i,
        /^no isi halaman$/i,
        /^\d+\s+standar spmi universitas islam madura$/i,
        /^halaman\s*:/i,
        /^kode\s*:/i,
        /^alamat:/i,
        /^www\./i,
        /^tanggal\s*:/i,
        /^revisi\s*:/i,
        /^proses$/i,
        /^penanggung jawab$/i,
        /^tanda tangan$/i,
        /^nama$/i,
        /^jabatan$/i,
        /^proses\s+penanggung jawab/i,
        /^nama\s+jabatan$/i,
        /^[\-–]?\d[\d\-]{4,}$/i,
        /^\d+$/i,
    ].some((pattern) => pattern.test(normalized));
};

const cropToStandardBody = (lines) => {
    const firstMajorSectionIndex = lines.findIndex((line) => isMajorSectionLine(line.trim()));

    if (firstMajorSectionIndex !== -1) {
        return lines.slice(firstMajorSectionIndex);
    }

    const startIndex = lines.findIndex((line, index, source) => {
        if (!/^1\.\s+/i.test(line.trim())) {
            return false;
        }

        const lookahead = source.slice(index + 1, index + 6);
        return lookahead.some((candidate) => isStatementLine(candidate.trim()));
    });

    if (startIndex === -1) {
        return lines;
    }

    return lines.slice(startIndex);
};

const buildTreeFromText = (text) => {
    const lines = normalizeText(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const tree = [];
    let currentHeaderIndex = null;
    let currentStatementIndex = null;
    let paragraphBuffer = [];
    let activeListItemIndex = null;

    const flushParagraphBuffer = () => {
        if (!paragraphBuffer.length || currentHeaderIndex === null || currentStatementIndex === null) {
            paragraphBuffer = [];
            return;
        }

        const content = paragraphBuffer.join(' ').trim();
        if (content) {
            tree[currentHeaderIndex].children[currentStatementIndex].children.push(buildNode('Indicator', content));
        }

        paragraphBuffer = [];
        activeListItemIndex = null;
    };

    const ensureStatementNode = () => {
        if (currentHeaderIndex === null) {
            return false;
        }

        if (currentStatementIndex !== null) {
            return true;
        }

        tree[currentHeaderIndex].children.push(buildNode('Statement', 'Uraian'));
        currentStatementIndex = tree[currentHeaderIndex].children.length - 1;
        return true;
    };

    for (const line of lines) {
        if (shouldSkipLine(line)) {
            continue;
        }

        if (isHeaderLine(line) || isMajorSectionLine(line)) {
            flushParagraphBuffer();
            tree.push(buildNode('Header', cleanSectionLabel(line)));
            currentHeaderIndex = tree.length - 1;
            currentStatementIndex = null;
            activeListItemIndex = null;
            continue;
        }

        if (isStatementLine(line) || isMinorSectionLine(line)) {
            flushParagraphBuffer();
            if (currentHeaderIndex === null) {
                continue;
            }
            tree[currentHeaderIndex].children.push(buildNode('Statement', cleanSectionLabel(line)));
            currentStatementIndex = tree[currentHeaderIndex].children.length - 1;
            activeListItemIndex = null;
            continue;
        }

        if (isContentListLine(line)) {
            flushParagraphBuffer();
            if (!ensureStatementNode()) {
                continue;
            }
            tree[currentHeaderIndex].children[currentStatementIndex].children.push(buildNode('Indicator', line));
            activeListItemIndex = tree[currentHeaderIndex].children[currentStatementIndex].children.length - 1;
            continue;
        }

        if (currentHeaderIndex === null) {
            continue;
        }

        if (activeListItemIndex !== null) {
            const current = tree[currentHeaderIndex].children[currentStatementIndex].children[activeListItemIndex].content || '';
            tree[currentHeaderIndex].children[currentStatementIndex].children[activeListItemIndex].content = `${current} ${line}`.trim();
            continue;
        }

        if (!ensureStatementNode()) {
            continue;
        }

        if (paragraphBuffer.length && !shouldContinueParagraph(paragraphBuffer[paragraphBuffer.length - 1], line)) {
            flushParagraphBuffer();
        }

        paragraphBuffer.push(line);
    }

    flushParagraphBuffer();

    return tree.filter((header) => header.content || header.children.length > 0);
};

const reconstructPageLines = (items) => {
    const textItems = items
        .filter((item) => typeof item.str === 'string' && item.str.trim() !== '')
        .map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width || 0,
        }))
        .sort((left, right) => {
            if (Math.abs(right.y - left.y) > 2) {
                return right.y - left.y;
            }

            return left.x - right.x;
        });

    const rows = [];

    for (const item of textItems) {
        const existingRow = rows.find((row) => Math.abs(row.y - item.y) <= 2);

        if (existingRow) {
            existingRow.items.push(item);
            continue;
        }

        rows.push({
            y: item.y,
            items: [item],
        });
    }

    return rows
        .sort((left, right) => right.y - left.y)
        .map((row) => row.items.sort((left, right) => left.x - right.x))
        .map((rowItems) => {
            let line = '';
            let previous = null;

            for (const item of rowItems) {
                if (previous) {
                    const previousRight = previous.x + previous.width;
                    const gap = item.x - previousRight;

                    if (gap > 2) {
                        line += ' ';
                    }
                }

                line += item.str;
                previous = item;
            }

            return line.replace(/[ \t]+/g, ' ').trim();
        })
        .filter((line) => !shouldSkipLine(line));
};

const extractText = async (absolutePath) => {
    const data = await fs.readFile(absolutePath);
    const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(data),
        standardFontDataUrl: path.resolve('node_modules/pdfjs-dist/standard_fonts/') + path.sep,
    }).promise;

    const pages = [];
    const rawLines = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageLines = reconstructPageLines(textContent.items);
        rawLines.push(...pageLines);
        const pageText = pageLines.join('\n').trim();

        if (pageText) {
            pages.push(pageText);
        }
    }

    return {
        extractedText: cropToStandardBody(
            pages.join('\n').split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        ).join('\n'),
        metadata: (() => {
            const revisionValue = rawLines.find((line) => /^revisi\s*:/i.test(line))?.replace(/^revisi\s*:\s*/i, '').trim();

            return {
                standard_code: rawLines.find((line) => /^kode\s*:/i.test(line))?.replace(/^kode\s*:\s*/i, '').trim() || null,
                revision_number: revisionValue !== undefined && /^\d+$/.test(revisionValue) ? Number(revisionValue) : null,
                page_count: pdf.numPages || null,
                iku_count: countUniqueIndicatorCodes(rawLines.join('\n'), 'IKU'),
                ikt_count: countUniqueIndicatorCodes(rawLines.join('\n'), 'IKT'),
            };
        })(),
    };
};

try {
    const { extractedText, metadata } = await extractText(path.resolve(filePath));
    const structureTree = buildTreeFromText(extractedText);

    process.stdout.write(JSON.stringify({
        extracted_text: extractedText,
        structure_tree: structureTree,
        metadata,
    }));
} catch (error) {
    console.error(error?.message || String(error));
    process.exit(1);
}
