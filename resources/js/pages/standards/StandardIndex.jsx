import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { toast } from 'react-toastify';
import StandardCloneModal from './StandardCloneModal';
import StandardCycleImportModal from './StandardCycleImportModal';
import Icon, { Icons } from '../../components/ui/Icon';
import { getStandardStatusLabel, normalizeStandardCategory } from '../../utils/standardStatus';
import * as pdfjsLib from 'pdfjs-dist';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getFacetedRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel
} from '@tanstack/react-table';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const buildNode = (type, content) => ({
    type,
    content: String(content || '').trim(),
    children: [],
});

const isHeaderLine = (line) => /^[0-9]+\.\s+\S+/.test(line);
const isStatementLine = (line) => /^[A-Za-z]\.\s+\S+/.test(line);
const isContentListLine = (line) => /^[0-9]+\)\s+\S+/.test(line);

const shouldSkipLine = (line) => {
    const normalized = line.trim();

    if (!normalized) {
        return true;
    }

    return [
        /^universitas islam madura$/i,
        /^standar spmi universitas islam madura$/i,
        /^standar mutu kemahasiswaan$/i,
        /^daftar isi$/i,
        /^\d+\s+standar spmi universitas islam madura$/i,
        /^halaman\s*:/i,
        /^kode\s*:/i,
        /^alamat:/i,
        /^tanggal\s*:/i,
        /^revisi\s*:/i,
        /^proses\s+penanggung jawab/i,
        /^nama\s+jabatan$/i,
    ].some((pattern) => pattern.test(normalized));
};

const cropToStandardBody = (lines) => {
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

const normalizeExtractedText = (text) => (
    String(text || '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
);

const buildStructureTreeFromText = (text) => {
    const lines = normalizeExtractedText(text)
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

    lines.forEach((line) => {
        if (shouldSkipLine(line)) {
            return;
        }

        if (isHeaderLine(line)) {
            flushParagraphBuffer();
            tree.push(buildNode('Header', line));
            currentHeaderIndex = tree.length - 1;
            currentStatementIndex = null;
            activeListItemIndex = null;
            return;
        }

        if (isStatementLine(line)) {
            flushParagraphBuffer();
            if (currentHeaderIndex === null) {
                return;
            }
            tree[currentHeaderIndex].children.push(buildNode('Statement', line));
            currentStatementIndex = tree[currentHeaderIndex].children.length - 1;
            activeListItemIndex = null;
            return;
        }

        if (isContentListLine(line)) {
            flushParagraphBuffer();
            if (currentHeaderIndex === null || currentStatementIndex === null) {
                return;
            }
            tree[currentHeaderIndex].children[currentStatementIndex].children.push(buildNode('Indicator', line));
            activeListItemIndex = tree[currentHeaderIndex].children[currentStatementIndex].children.length - 1;
            return;
        }

        if (currentHeaderIndex === null || currentStatementIndex === null) {
            return;
        }

        if (activeListItemIndex !== null) {
            const current = tree[currentHeaderIndex].children[currentStatementIndex].children[activeListItemIndex].content || '';
            tree[currentHeaderIndex].children[currentStatementIndex].children[activeListItemIndex].content = `${current} ${line}`.trim();
            return;
        }

        paragraphBuffer.push(line);
    });

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

    textItems.forEach((item) => {
        const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2);

        if (row) {
            row.items.push(item);
            return;
        }

        rows.push({ y: item.y, items: [item] });
    });

    return rows
        .sort((left, right) => right.y - left.y)
        .map((row) => row.items.sort((left, right) => left.x - right.x))
        .map((rowItems) => {
            let line = '';
            let previous = null;

            rowItems.forEach((item) => {
                if (previous) {
                    const previousRight = previous.x + previous.width;
                    const gap = item.x - previousRight;

                    if (gap > 2) {
                        line += ' ';
                    }
                }

                line += item.str;
                previous = item;
            });

            return line.replace(/[ \t]+/g, ' ').trim();
        })
        .filter((line) => !shouldSkipLine(line));
};

const summarizeStructureTree = (nodes) => {
    const summary = { headers: 0, statements: 0, indicators: 0 };

    const visit = (items) => {
        items.forEach((item) => {
            if (item.type === 'Header') summary.headers += 1;
            if (item.type === 'Statement') summary.statements += 1;
            if (item.type === 'Indicator') summary.indicators += 1;
            if (item.children?.length) {
                visit(item.children);
            }
        });
    };

    visit(nodes || []);

    return summary;
};

export default function StandardIndex() {
    const [standards, setStandards] = useState([]);
    const [pendingAuditCounts, setPendingAuditCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);

    const user = useSelector(state => state.auth.user);
    const roles = user?.roles || [];
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));
    const isAuditee = hasRole('Auditee');
    const canManageStandardEvidence = !isAuditee && (
        hasRole('SuperAdmin')
        || hasRole('LPM-Admin')
        || hasRole('Kepala LPMI')
        || hasRole('Wakil Rektor 1')
        || hasRole('Wakil Rektor 2')
        || hasRole('Wakil Rektor 3')
        || hasRole('Rektor')
    );
    const isPimpinan = hasRole('Pimpinan')
        || hasRole('Kepala LPMI')
        || hasRole('Wakil Rektor 1')
        || hasRole('Wakil Rektor 2')
        || hasRole('Wakil Rektor 3')
        || hasRole('Rektor');
    const canManageStandards = hasRole('SuperAdmin')
        || user?.permissions?.includes('standard.create')
        || user?.permissions?.includes('standard.update')
        || user?.permissions?.includes('standard.delete')
        || user?.permissions?.includes('standard.publish');
    const canSubmitStandards = hasRole('SuperAdmin')
        || user?.permissions?.includes('standard.publish');
    const canReviewAudit = hasRole('SuperAdmin')
        || hasRole('Auditor')
        || hasRole('LPM-Admin')
        || user?.permissions?.includes('audit.score.update');
    const canReviewStandards = hasRole('SuperAdmin')
        || hasRole('Pimpinan')
        || hasRole('Kepala LPMI')
        || hasRole('Wakil Rektor 1')
        || hasRole('Wakil Rektor 2')
        || hasRole('Wakil Rektor 3')
        || hasRole('Rektor')
        || user?.permissions?.includes('standard.publish');
    const canExportStandards = hasRole('SuperAdmin')
        || user?.permissions?.includes('report.export');
    // Modal state for Create/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCycleImportModalOpen, setIsCycleImportModalOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneTarget, setCloneTarget] = useState(null);
    const [editingStandard, setEditingStandard] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [importExtractedText, setImportExtractedText] = useState('');
    const [importStructureTree, setImportStructureTree] = useState([]);
    const [importSummary, setImportSummary] = useState(null);
    const [isParsingImportFile, setIsParsingImportFile] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Tambahan',
        periode_tahun: new Date().getFullYear(),
        is_active: true,
        referensi_regulasi: ''
    });
    const [cloneSourceId, setCloneSourceId] = useState('');

    useEffect(() => {
        fetchStandards();
    }, []);

    const upsertStandard = (incomingStandard) => {
        setStandards((current) => {
            const next = current.filter((item) => item.id !== incomingStandard.id);
            return [incomingStandard, ...next];
        });
    };

    const removeStandard = (standardId) => {
        setStandards((current) => current.filter((item) => item.id !== standardId));
    };

    const getPeriodStatus = (items) => {
        if (!items.length) {
            return 'Non Aktif';
        }

        if (items.every((item) => item.status === 'TERBIT')) {
            return 'Dilaksanakan';
        }

        if (items.some((item) => item.status === 'WAITING_APPROVAL' || item.status === 'REVISI' || item.is_active)) {
            return 'Dalam Proses';
        }

        return 'Non Aktif';
    };

    const periodGroups = useMemo(() => {
        const grouped = standards.reduce((carry, item) => {
            const periodKey = item.periode_tahun ? String(item.periode_tahun) : 'Tanpa Periode';

            if (!carry[periodKey]) {
                carry[periodKey] = [];
            }

            carry[periodKey].push(item);

            return carry;
        }, {});

        return Object.entries(grouped)
            .sort(([left], [right]) => {
                if (left === 'Tanpa Periode') {
                    return 1;
                }

                if (right === 'Tanpa Periode') {
                    return -1;
                }

                return Number(right) - Number(left);
            })
            .map(([period, items]) => ({
                period,
                items,
            }));
    }, [standards]);

    useEffect(() => {
        if (periodGroups.length === 0) {
            setSelectedPeriod(null);
            return;
        }

        const stillExists = periodGroups.some(({ period }) => period === selectedPeriod);

        if (!stillExists) {
            setSelectedPeriod(periodGroups[0].period);
        }
    }, [periodGroups, selectedPeriod]);

    const filteredStandards = useMemo(() => {
        if (!selectedPeriod) {
            return [];
        }

        return standards.filter((item) => {
            const itemPeriod = item.periode_tahun ? String(item.periode_tahun) : 'Tanpa Periode';
            return itemPeriod === selectedPeriod;
        });
    }, [selectedPeriod, standards]);

    useEffect(() => {
        if (!canReviewAudit) {
            setPendingAuditCounts({});
            return;
        }

        const fetchPendingAuditCounts = async () => {
            try {
                const response = await api.get('/evidences/audit');
                const evidences = response.data.data || [];
                const nextCounts = evidences.reduce((carry, evidence) => {
                    if (evidence.review_status !== 'PENDING') {
                        return carry;
                    }

                    const standardId = evidence.metric?.standard?.id;
                    if (!standardId) {
                        return carry;
                    }

                    carry[standardId] = (carry[standardId] || 0) + 1;
                    return carry;
                }, {});

                setPendingAuditCounts(nextCounts);
            } catch (error) {
                setPendingAuditCounts({});
            }
        };

        fetchPendingAuditCounts();
    }, [canReviewAudit]);

    const fetchStandards = async () => {
        try {
            setLoading(true);
            const response = await api.get('/standards');
            setStandards(response.data.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data standar.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (standard = null) => {
        if (!standard) {
            handleOpenImportModal();
            return;
        }

        if (standard) {
            setEditingStandard(standard);
            setFormData({
                name: standard.name,
                category: standard.category,
                periode_tahun: standard.periode_tahun || '',
                is_active: standard.is_active,
                referensi_regulasi: standard.referensi_regulasi || ''
            });
        } else {
            setEditingStandard(null);
            setFormData({
                name: '',
                category: 'Tambahan',
                periode_tahun: new Date().getFullYear(),
                is_active: true,
                referensi_regulasi: ''
            });
        }
        setCloneSourceId('');
        setIsModalOpen(true);
    };

    const handleOpenImportModal = () => {
        setEditingStandard(null);
        setCloneTarget(null);
        setCloneSourceId('');
        setImportFile(null);
        setImportExtractedText('');
        setImportStructureTree([]);
        setImportSummary(null);
        setFormData({
            name: '',
            category: 'Tambahan',
            periode_tahun: selectedPeriod || new Date().getFullYear(),
            is_active: true,
            referensi_regulasi: '',
        });
        setIsImportModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStandard(null);
        setCloneSourceId('');
    };

    const handleCloseImportModal = () => {
        setIsImportModalOpen(false);
        setCloneSourceId('');
        setImportFile(null);
        setImportExtractedText('');
        setImportStructureTree([]);
        setImportSummary(null);
    };

    const handleCycleImportSuccess = (importedStandards) => {
        const importedList = Array.isArray(importedStandards) ? importedStandards : [];

        importedList.forEach((standard) => {
            upsertStandard(standard);
        });

        if (selectedPeriod) {
            setSelectedPeriod(String(selectedPeriod));
        }

        fetchStandards();
    };

    const extractTextFromPdf = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = reconstructPageLines(textContent.items).join('\n').trim();

            if (pageText) {
                pages.push(pageText);
            }
        }

        return cropToStandardBody(
            pages.join('\n').split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        ).join('\n');
    };

    const handleImportFileChange = async (event) => {
        const file = event.target.files?.[0];
        setImportFile(file || null);
        setImportExtractedText('');
        setImportStructureTree([]);
        setImportSummary(null);

        if (!file) {
            return;
        }

        setIsParsingImportFile(true);

        try {
            const extractedText = await extractTextFromPdf(file);
            const tree = buildStructureTreeFromText(extractedText);
            const summary = summarizeStructureTree(tree);

            setImportExtractedText(extractedText);
            setImportStructureTree(tree);
            setImportSummary(summary);

            setFormData((current) => ({
                ...current,
                name: file.name.replace(/\.[^.]+$/u, ''),
            }));
        } catch (error) {
            setImportExtractedText('');
            setImportStructureTree([]);
            setImportSummary(null);
            toast.error('PDF gagal dibaca. Pastikan file memiliki text layer yang dapat diekstrak.');
        } finally {
            setIsParsingImportFile(false);
        }
    };

    const cloneCandidates = useMemo(() => (
        standards
            .filter((item) => !editingStandard || item.id !== editingStandard.id)
            .sort((left, right) => {
                const rightTime = new Date(right.created_at || 0).getTime();
                const leftTime = new Date(left.created_at || 0).getTime();
                return rightTime - leftTime;
            })
    ), [editingStandard, standards]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingStandard) {
                const response = await api.put(`/standards/${editingStandard.id}`, formData);
                upsertStandard(response.data.data);
                toast.success('Standar Mutu berhasil diperbarui.');
            } else {
                const response = await api.post('/standards', formData);
                const createdStandard = response.data.data;
                upsertStandard(createdStandard);
                setSelectedPeriod(createdStandard.periode_tahun ? String(createdStandard.periode_tahun) : 'Tanpa Periode');
                toast.success('Standar Mutu baru berhasil dibuat.');
            }
            handleCloseModal();
            fetchStandards();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan standar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.warning('Pilih dokumen PDF standar terlebih dahulu.');
            return;
        }

        if (!importStructureTree.length) {
            toast.warning('Struktur poin belum berhasil dibaca dari dokumen.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('category', formData.category);
            payload.append('periode_tahun', String(formData.periode_tahun || ''));
            payload.append('is_active', formData.is_active ? '1' : '0');
            payload.append('referensi_regulasi', formData.referensi_regulasi || '');
            payload.append('file', importFile);
            payload.append('extracted_text', importExtractedText);
            payload.append('structure_tree', JSON.stringify(importStructureTree));

            const response = await api.post('/standards/import', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const createdStandard = response.data.data;
            upsertStandard(createdStandard);
            setSelectedPeriod(createdStandard.periode_tahun ? String(createdStandard.periode_tahun) : 'Tanpa Periode');
            toast.success('Standar berhasil diimpor dari dokumen PDF.');
            handleCloseImportModal();
            fetchStandards();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengimpor dokumen standar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus standar ini? Semua komponen di dalamnya juga akan ikut terhapus secara berjenjang.')) {
            try {
                await api.delete(`/standards/${id}`);
                removeStandard(id);
                toast.success('Standar berhasil dihapus seluruhnya.');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus standar.');
            }
        }
    };

    const handleSubmitForApproval = async (id) => {
        if (window.confirm('Ajukan Standar Mutu ini ke Kepala LPMI? Setelah itu approval akan berlanjut ke Wakil Rektor 1, lalu Rektor.')) {
            try {
                const response = await api.patch(`/standards/${id}/submit`);
                upsertStandard(response.data.data);
                toast.success('Standar Mutu berhasil DIAJUKAN.');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal mengajukan standar.');
            }
        }
    };

    const handleOpenCloneModal = (standard) => {
        setCloneTarget(standard);
        setIsCloneModalOpen(true);
    };

    const handleExport = async (standard) => {
        try {
            const response = await api.get(`/standards/${standard.id}/export`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/msword' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = `${(standard.name || 'standar').replace(/[\\/:*?"<>|]+/g, '-')}-${standard.periode_tahun || 'tanpa-periode'}.doc`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ekspor standar gagal dijalankan.');
        }
    };

    // TanStack Table Setup
    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Nama Standar',
            cell: info => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">{info.getValue()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate max-w-xs" title={info.row.original.referensi_regulasi}>
                        {info.row.original.referensi_regulasi || 'Tidak ada referensi regulasi'}
                    </div>
                </div>
            )
        }),
        columnHelper.accessor('category', {
            header: 'Kategori',
            cell: info => {
                const val = normalizeStandardCategory(info.getValue());
                return (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${
                        val === 'Pendidikan'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                            : val === 'Penelitian'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                                : val === 'Pengabdian'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                        {val}
                    </span>
                );
            }
        }),
        columnHelper.accessor('periode_tahun', {
            header: 'Periode',
            cell: info => <span className="text-gray-600 dark:text-gray-300">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            sortingFn: (rowA, rowB, columnId) => {
                const rank = {
                    DRAFT: 1,
                    REVISI: 2,
                    WAITING_APPROVAL: 3,
                    TERBIT: 4,
                };

                return (rank[rowA.getValue(columnId)] || 0) - (rank[rowB.getValue(columnId)] || 0);
            },
            cell: info => {
                const status = info.getValue() || 'DRAFT';
                if (status === 'TERBIT') {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold leading-5 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800">
                            <Icon icon={Icons.shield} width={14} />
                            Terbit
                        </span>
                    );
                }
                if (status === 'WAITING_APPROVAL') {
                    return (
                        <span
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold leading-5 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800"
                            title={getStandardStatusLabel(info.row.original)}
                        >
                            <Icon icon={Icons.pending} width={14} />
                            {getStandardStatusLabel(info.row.original)}
                        </span>
                    );
                }
                if (status === 'REVISI') {
                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold leading-5 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-800">
                                <Icon icon={Icons.refresh} width={14} />
                                Revisi
                            </span>
                            {info.row.original.reject_reason && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 italic max-w-xs truncate" title={info.row.original.reject_reason}>
                                    Catatan: {info.row.original.reject_reason}
                                </span>
                            )}
                        </div>
                    );
                }
                // DRAFT
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold leading-5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow-sm border border-amber-200 dark:border-amber-800">
                        <Icon icon={Icons.draft} width={14} />
                        Draft
                    </span>
                );
            }
        }),
        columnHelper.accessor('is_active', {
            header: 'Visibilitas',
            sortingFn: (rowA, rowB, columnId) => Number(rowA.getValue(columnId)) - Number(rowB.getValue(columnId)),
            cell: info => {
                const isActive = info.getValue();
                return isActive ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold leading-5 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Aktif</span>
                ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold leading-5 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Non-Aktif</span>
                );
            }
        }),
        columnHelper.accessor('created_at', {
            header: 'Dibuat',
            cell: info => {
                const value = info.getValue();
                if (!value) {
                    return <span className="text-gray-600 dark:text-gray-300">-</span>;
                }

                return (
                    <span className="text-gray-600 dark:text-gray-300">
                        {new Date(value).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                        })}
                    </span>
                );
            }
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Aksi',
            enableSorting: false,
            cell: info => {
                const item = info.row.original;
                const actionButtons = [];

                actionButtons.push(
                    <Link
                        key="detail"
                        to={`/standards/${item.id}/detail`}
                        className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                        Detail
                    </Link>
                );

                if (canSubmitStandards && !isPimpinan && (item.status === 'DRAFT' || item.status === 'REVISI')) {
                    actionButtons.push(
                        <button
                            key="submit"
                            onClick={() => handleSubmitForApproval(item.id)}
                            className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700 transition hover:bg-blue-100 hover:text-blue-900"
                            title="Ajukan ke Kepala LPMI"
                        >
                            Ajukan
                        </button>
                    );
                }

                return (
                    <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium">
                        {actionButtons}
                    </div>
                );
            }
        })
    ], [canSubmitStandards, isPimpinan]);

    const table = useReactTable({
        data: filteredStandards,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            globalFilter,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        initialState: {
            pagination: {
                pageSize: 10,
            }
        }
    });

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dokumen Standar Mutu</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                        Pilih periode terlebih dahulu, lalu lihat seluruh dokumen Pendidikan, Penelitian, Pengabdian, dan Tambahan yang terdaftar pada periode tersebut.
                    </p>
                </div>
                {canManageStandards && (
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
                    <button
                        onClick={() => setIsCycleImportModalOpen(true)}
                        disabled={!selectedPeriod}
                        className="inline-flex items-center gap-1 justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-gray-800"
                    >
                        <Icon icon={Icons.refresh} width={18} />
                        Impor Siklus Lama
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-1 justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Standar
                    </button>
                </div>
                )}
            </div>

            <StandardCycleImportModal
                isOpen={isCycleImportModalOpen}
                onClose={() => setIsCycleImportModalOpen(false)}
                targetPeriod={selectedPeriod}
                onSuccess={handleCycleImportSuccess}
            />

            {error && (
                <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                    {error}
                </div>
            )}

            {/* Table Controls (Search & View) */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-full sm:w-auto">
                    <label className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <span className="font-semibold text-gray-900 dark:text-white">Periode aktif</span>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                                value={selectedPeriod || ''}
                                onChange={(e) => {
                                    setSelectedPeriod(e.target.value || null);
                                    setGlobalFilter('');
                                    table.setPageIndex(0);
                                }}
                                disabled={loading || periodGroups.length === 0}
                                className="min-w-[180px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            >
                                {periodGroups.length === 0 ? (
                                    <option value="">Belum ada periode</option>
                                ) : (
                                    periodGroups.map(({ period }) => (
                                        <option key={period} value={period}>
                                            {period}
                                        </option>
                                    ))
                                )}
                            </select>
                            <span className="text-gray-500 dark:text-gray-400">
                                {selectedPeriod ? `(${filteredStandards.length} standar)` : 'Pilih periode'}
                            </span>
                            {selectedPeriod && (
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    getPeriodStatus(filteredStandards) === 'Dilaksanakan'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}>
                                    {getPeriodStatus(filteredStandards)}
                                </span>
                            )}
                        </div>
                    </label>
                </div>
                <div className="w-full sm:max-w-xs relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon={Icons.search} width={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder={selectedPeriod ? `Cari standar periode ${selectedPeriod}...` : 'Pilih periode terlebih dahulu'}
                        disabled={!selectedPeriod}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800/80">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 group ${
                                                        header.column.getCanSort() ? 'cursor-pointer' : ''
                                                    } ${
                                                        header.id === 'actions' ? 'w-1 whitespace-nowrap' : ''
                                                    }`}
                                                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {header.column.getCanSort() && (
                                                            header.column.getIsSorted() === 'asc'
                                                                ? <Icon icon={Icons.sortAsc} width={14} />
                                                                : header.column.getIsSorted() === 'desc'
                                                                    ? <Icon icon={Icons.sortDesc} width={14} />
                                                                    : <Icon icon={Icons.sort} width={14} className="opacity-0 group-hover:opacity-100 text-gray-300" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : table.getRowModel().rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Tidak ada data standar ditemukan.
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                {row.getVisibleCells().map(cell => (
                                                    <td
                                                        key={cell.id}
                                                        className={`px-6 py-4 text-sm text-gray-900 ${
                                                            cell.column.id === 'actions' ? 'w-1 whitespace-normal text-center' : 'whitespace-nowrap'
                                                        }`}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {table.getPageCount() > 1 && !loading && (
                                <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="relative inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            <Icon icon={Icons.prev} width={16} />
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="ml-3 relative inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            Next
                                            <Icon icon={Icons.next} width={16} />
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                                Halaman <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> dari <span className="font-medium">{table.getPageCount()}</span>
                                                {' '}<span>({table.getPrePaginationRowModel().rows.length} Total Data)</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => table.setPageIndex(0)}
                                                    disabled={!table.getCanPreviousPage()}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.first} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.previousPage()}
                                                    disabled={!table.getCanPreviousPage()}
                                                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.prev} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.nextPage()}
                                                    disabled={!table.getCanNextPage()}
                                                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.next} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                                    disabled={!table.getCanNextPage()}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.last} width={20} />
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white" id="modal-title">
                                    {editingStandard ? 'Edit Standar Mutu' : 'Tambah Standar Mutu Baru'}
                                </h3>
                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    Silakan lengkapi formulir informasi dasar kepatuhan standar mutu berikut.
                                </div>
                                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Standar <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            placeholder="Contoh: Standar Kompetensi Lulusan"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Kategori Utama</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            >
                                                <option value="Pendidikan">Pendidikan</option>
                                                <option value="Penelitian">Penelitian</option>
                                                <option value="Pengabdian">Pengabdian</option>
                                                <option value="Tambahan">Tambahan</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tahun Implementasi</label>
                                            <input
                                                type="number"
                                                value={formData.periode_tahun}
                                                onChange={(e) => setFormData({ ...formData, periode_tahun: e.target.value })}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Referensi Regulasi</label>
                                        <textarea
                                            rows="2"
                                            value={formData.referensi_regulasi}
                                            onChange={(e) => setFormData({ ...formData, referensi_regulasi: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            placeholder="SK Rektor No. XX Tahun YYYY / Permen No. XX Tahun YYYY"
                                        ></textarea>
                                    </div>
                                    <div className="flex items-center pt-2">
                                        <input
                                            id="is_active"
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label htmlFor="is_active" className="ml-3 block text-sm font-semibold text-gray-900 dark:text-gray-200">
                                            Status Aktif (Berlaku Siklus Saat Ini)
                                        </label>
                                    </div>
                                    <div className="mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full inline-flex justify-center rounded-md flex-row items-center gap-1 border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="animate-spin">
                                                        <Icon icon={Icons.refresh} width={16} />
                                                    </span>
                                                    Merekam Data...
                                                </>
                                            ) : (
                                                <>
                                                    <Icon icon={Icons.save} width={16} />
                                                    Simpan Dokumen
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="import-modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={handleCloseImportModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white" id="import-modal-title">
                                    Tambah Standar Mutu Baru
                                </h3>
                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    Lengkapi data standar dan upload dokumen PDF. Nama standar akan terisi otomatis dari nama file yang dipilih.
                                </div>
                                <form onSubmit={handleImportSubmit} className="mt-5 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Standar <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            placeholder="Akan terisi otomatis dari nama file"
                                        />
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Nama akan otomatis mengikuti nama file saat dokumen dipilih, tetapi masih bisa disesuaikan manual bila diperlukan.
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Kategori <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                        >
                                            <option value="Pendidikan">Pendidikan</option>
                                            <option value="Penelitian">Penelitian</option>
                                            <option value="Pengabdian">Pengabdian</option>
                                            <option value="Tambahan">Tambahan</option>
                                        </select>
                                    </div>
                                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        <label className="mb-1 block text-sm font-semibold text-amber-900">
                                            Dokumen Upload <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            required
                                            onChange={handleImportFileChange}
                                            className="block w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <div className="mt-2 text-xs text-amber-800">
                                            Format yang didukung: PDF dengan text layer.
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        <div>Tahun implementasi: {selectedPeriod || new Date().getFullYear()}.</div>
                                        <div className="mt-1">
                                            {isParsingImportFile && 'Sedang membaca dokumen PDF...'}
                                            {!isParsingImportFile && importSummary && `Tree terbaca: ${importSummary.headers} header, ${importSummary.statements} pasal, ${importSummary.indicators} indikator.`}
                                            {!isParsingImportFile && !importSummary && 'Tree poin akan muncul setelah PDF berhasil dibaca.'}
                                        </div>
                                    </div>
                                    <div className="mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full inline-flex justify-center rounded-md flex-row items-center gap-1 border border-transparent shadow-sm px-4 py-2 bg-amber-600 text-base font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Standar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseImportModal}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <StandardCloneModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                originalStandard={cloneTarget}
                onSuccess={fetchStandards}
            />
        </div>
    );
}
