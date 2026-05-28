import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { getCached } from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

const statusStyles = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function formatDate(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatBytes(bytes) {
    if (!bytes) {
        return '-';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSearchTerms(value) {
    return Array.from(
        new Set(
            String(value || '')
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean)
        )
    );
}

function renderHighlightedText(content, searchTerms) {
    const text = String(content || '');

    if (searchTerms.length === 0) {
        return text;
    }

    const pattern = new RegExp(`(${searchTerms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return parts.map((part, index) => {
        const isMatch = searchTerms.some((term) => part.toLowerCase() === term);

        return isMatch ? (
            <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-1 text-gray-900">
                {part}
            </mark>
        ) : (
            <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        );
    });
}

function filterMetricTree(nodes, searchTerms) {
    if (searchTerms.length === 0) {
        return nodes;
    }

    return nodes.reduce((result, node) => {
        const filteredChildren = filterMetricTree(node.children_recursive || [], searchTerms);
        const content = String(node.content || '').toLowerCase();
        const matchesNode = searchTerms.every((term) => content.includes(term));

        if (matchesNode || filteredChildren.length > 0) {
            result.push({
                ...node,
                children_recursive: filteredChildren,
            });
        }

        return result;
    }, []);
}

function flattenIndicatorOptions(nodes, options = []) {
    nodes.forEach((node) => {
        if (node.type === 'Indicator') {
            options.push({
                id: node.id,
                label: node.content || `Butir mutu #${node.id}`,
                iku: node.iku || '-',
                ikt: node.ikt || '-',
            });
        }

        if (node.children_recursive?.length) {
            flattenIndicatorOptions(node.children_recursive, options);
        }
    });

    return options;
}

function buildButirMutuRows(standards, treesByStandardId) {
    return standards.flatMap((standard) => (
        flattenIndicatorOptions(treesByStandardId[String(standard.id)] || []).map((item) => ({
            id: item.id,
            standardId: standard.id,
            standardName: standard.name,
            period: standard.periode_tahun || '-',
            iku: item.iku || '-',
            ikt: item.ikt || '-',
            statement: item.label,
        }))
    ));
}

function renderMetricTree(nodes, searchTerms, depth = 0) {
    return nodes.map((node) => {
        return (
            <div key={node.id} className="space-y-2">
                <div
                    className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3"
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        <span>{node.type}</span>
                    </div>
                    <div className="text-sm leading-6 text-gray-800">{renderHighlightedText(node.content, searchTerms)}</div>
                </div>

                {node.children_recursive?.length > 0 && renderMetricTree(node.children_recursive, searchTerms, depth + 1)}
            </div>
        );
    });
}

export default function StandardAuditReviewPage() {
    const { standardId } = useParams();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const canCreatePtk = permissions.includes('ptk.create');
    const [standard, setStandard] = useState(null);
    const [evidences, setEvidences] = useState([]);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [standardTree, setStandardTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [standardTreeLoading, setStandardTreeLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [createPtkOnReject, setCreatePtkOnReject] = useState(false);
    const [submittingAction, setSubmittingAction] = useState('');
    const [standardSearch, setStandardSearch] = useState('');
    const [findings, setFindings] = useState([{ referenceMetricId: '', statement: '' }]);
    const [targetCompletionDate, setTargetCompletionDate] = useState('');
    const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
    const [referenceDialogIndex, setReferenceDialogIndex] = useState(null);
    const [referenceRowsLoading, setReferenceRowsLoading] = useState(false);
    const [referenceRows, setReferenceRows] = useState([]);
    const [referenceSearch, setReferenceSearch] = useState('');
    const [referencePeriodFilter, setReferencePeriodFilter] = useState('ALL');

    const fetchPageData = async () => {
        try {
            setLoading(true);
            const [standardResponse, treeResponse, evidenceResponse] = await Promise.all([
                api.get(`/standards/${standardId}`),
                api.get(`/standards/${standardId}/metrics/tree`),
                api.get('/evidences/audit'),
            ]);

            const currentStandard = standardResponse.data.data;
            const nextTree = treeResponse.data.data || [];
            const nextEvidences = (evidenceResponse.data.data || []).filter(
                (item) => String(item.metric?.standard?.id) === String(standardId)
            );

            setStandard(currentStandard);
            setStandardTree(nextTree);
            setEvidences(nextEvidences);
            setSelectedEvidence((current) => nextEvidences.find((item) => item.id === current?.id) || nextEvidences[0] || null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Halaman review standar gagal dimuat.');
        } finally {
            setLoading(false);
            setStandardTreeLoading(false);
        }
    };

    useEffect(() => {
        fetchPageData();
    }, [standardId]);

    useEffect(() => {
        if (!selectedEvidence) {
            setReviewComment('');
            setPreviewUrl('');
            setFindings([{ referenceMetricId: '', statement: '' }]);
            setTargetCompletionDate('');
            return;
        }

        setReviewComment(selectedEvidence.review_status === 'REJECTED' ? (selectedEvidence.review_comment || '') : '');
        setCreatePtkOnReject(false);
        setTargetCompletionDate('');
        setFindings([
            {
                referenceMetricId: selectedEvidence.metric?.id ? String(selectedEvidence.metric.id) : '',
                statement: '',
            },
        ]);
    }, [selectedEvidence]);

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handlePreview = async (evidence) => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl('');

        if (evidence.source_type === 'link') {
            setPreviewUrl(evidence.link_url);
            return;
        }

        if (!evidence.is_previewable) {
            toast.info('File ini belum mendukung preview inline. Gunakan unduh file.');
            return;
        }

        setPreviewLoading(true);

        try {
            const response = await api.get(`/evidences/${evidence.id}/download`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            setPreviewUrl(url);
        } catch (error) {
            toast.error('Preview bukti gagal dimuat.');
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEvidence) {
            handlePreview(selectedEvidence);
        }
    }, [selectedEvidence]);

    const standardSearchTerms = useMemo(() => getSearchTerms(standardSearch), [standardSearch]);
    const filteredStandardTree = useMemo(
        () => filterMetricTree(standardTree, standardSearchTerms),
        [standardTree, standardSearchTerms]
    );
    const indicatorOptions = useMemo(() => flattenIndicatorOptions(standardTree), [standardTree]);
    const referencePeriodOptions = useMemo(() => (
        Array.from(new Set(referenceRows.map((item) => String(item.period || '-')))).sort((left, right) => left.localeCompare(right, 'id-ID'))
    ), [referenceRows]);
    const filteredReferenceRows = useMemo(() => (
        referenceRows.filter((item) => (
            (referencePeriodFilter === 'ALL' || String(item.period || '-') === referencePeriodFilter)
            && `${item.standardName} ${item.iku} ${item.ikt} ${item.statement} ${item.period}`.toLowerCase().includes(referenceSearch.trim().toLowerCase())
        ))
    ), [referencePeriodFilter, referenceRows, referenceSearch]);

    const updateFinding = (index, field, value) => {
        setFindings((current) => current.map((item, itemIndex) => (
            itemIndex === index
                ? { ...item, [field]: value }
                : item
        )));
    };

    const addFinding = () => {
        setFindings((current) => [
            ...current,
            { referenceMetricId: '', statement: '' },
        ]);
    };

    const openReferenceDialog = async (index) => {
        setReferenceDialogIndex(index);
        setReferenceDialogOpen(true);

        if (referenceRows.length > 0) {
            return;
        }

        try {
            setReferenceRowsLoading(true);
            const standardsResponse = await getCached('/standards');
            const standards = standardsResponse.data.data || [];
            const treeEntries = await Promise.all(
                standards.map(async (item) => {
                    const treeResponse = await api.get(`/standards/${item.id}/metrics/tree`);
                    return [String(item.id), treeResponse.data.data || []];
                })
            );

            const nextRows = buildButirMutuRows(standards, Object.fromEntries(treeEntries));
            setReferenceRows(nextRows);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Daftar butir mutu gagal dimuat.');
        } finally {
            setReferenceRowsLoading(false);
        }
    };

    const selectReferenceButir = (row) => {
        if (referenceDialogIndex === null) {
            return;
        }

        updateFinding(referenceDialogIndex, 'referenceMetricId', String(row.id));
        setReferenceDialogOpen(false);
        setReferenceDialogIndex(null);
    };

    const buildFindingSummary = () => {
        const normalizedFindings = findings
            .map((item) => ({
                referenceMetricId: String(item.referenceMetricId || '').trim(),
                statement: String(item.statement || '').trim(),
            }))
            .filter((item) => item.referenceMetricId || item.statement);

        if (normalizedFindings.length === 0) {
            return reviewComment.trim();
        }

        const hasIncompleteFinding = normalizedFindings.some((item) => !item.referenceMetricId || !item.statement);

        if (hasIncompleteFinding) {
            throw new Error('Setiap temuan harus memiliki referensi butir mutu dan isi pernyataan.');
        }

        return normalizedFindings.map((item, index) => {
            const referenceRow = referenceRows.find((row) => String(row.id) === item.referenceMetricId);
            const referenceLabel = referenceRow
                ? `${referenceRow.iku !== '-' ? `IKU ${referenceRow.iku}` : 'Butir Mutu'}${referenceRow.ikt !== '-' ? ` / IKT ${referenceRow.ikt}` : ''} - ${referenceRow.statement}`
                : (indicatorOptions.find((option) => String(option.id) === item.referenceMetricId)?.label || `Butir mutu #${item.referenceMetricId}`);
            return `${index + 1}. Referensi butir mutu: ${referenceLabel}\nPernyataan: ${item.statement}`;
        }).join('\n\n');
    };

    const submitReview = async (action) => {
        if (!selectedEvidence) {
            return;
        }

        if (action === 'reject' && !createPtkOnReject) {
            const confirmed = window.confirm('PTK tidak dibuat, jika anda menolak auditee tidak mendapat kelonggaran untuk menirim berkas');

            if (!confirmed) {
                return;
            }
        }

        if (action === 'reject' && createPtkOnReject && !reviewComment.trim()) {
            toast.warning('Komentar auditor wajib diisi saat menolak bukti.');
            return;
        }

        setSubmittingAction(action);

        try {
            const response = await api.patch(`/evidences/${selectedEvidence.id}/review`, {
                action,
                comment: reviewComment.trim() || null,
            });

            if (action === 'reject' && createPtkOnReject) {
                if (!targetCompletionDate) {
                    throw new Error('Target tanggal koreksi wajib diisi untuk membuat PTK.');
                }

                const findingSummary = buildFindingSummary();

                if (!findingSummary.trim()) {
                    throw new Error('Isi temuan atau komentar auditor terlebih dahulu sebelum membuat PTK.');
                }

                await api.post('/ptk', {
                    metric_id: selectedEvidence.metric?.id,
                    evidence_id: selectedEvidence.id,
                    assigned_user_id: selectedEvidence.uploader?.id || null,
                    assigned_unit_id: selectedEvidence.uploader?.unit?.id || selectedEvidence.uploader?.unit_id || null,
                    target_completion_date: targetCompletionDate,
                    finding_summary: findingSummary,
                });
            }

            toast.success(response.data.message);
            navigate('/audit');
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Aksi review gagal diproses.');
        } finally {
            setSubmittingAction('');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-sm text-gray-500">Memuat halaman review standar...</div>;
    }

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                            <Icon icon={Icons.audit} width={14} />
                            Mulai Review
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{standard?.name || 'Review Standar'}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Fokus review per standar dengan dua pane tetap: dokumen bukti di kiri dan struktur standar di kanan.
                        </p>
                    </div>
                    <Link
                        to="/standards"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                        <Icon icon={Icons.back} width={16} />
                        Kembali ke Standar
                    </Link>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Dokumen Auditee</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    {selectedEvidence?.title || selectedEvidence?.original_name || selectedEvidence?.link_url || 'Pilih dokumen untuk mulai review'}
                                </p>
                            </div>
                            {selectedEvidence && (
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selectedEvidence.review_status] || statusStyles.PENDING}`}>
                                    {selectedEvidence.review_status}
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-gray-400">{evidences.length} item</span>
                            <Link
                                to="/audit"
                                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.back} width={14} />
                                Semua Dokumen
                            </Link>
                        </div>
                        {evidences.length > 1 && (
                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                    Pilih Dokumen
                                </label>
                                <select
                                    value={selectedEvidence?.id ? String(selectedEvidence.id) : ''}
                                    onChange={(event) => {
                                        const nextEvidence = evidences.find((item) => String(item.id) === event.target.value) || null;
                                        setSelectedEvidence(nextEvidence);
                                    }}
                                    className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                >
                                    {evidences.map((evidence) => (
                                        <option key={evidence.id} value={String(evidence.id)}>
                                            {(evidence.title || evidence.original_name || evidence.link_url || 'Dokumen bukti')} - {evidence.uploader?.name || 'Uploader tidak diketahui'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="h-[70vh] bg-gray-100">
                        {evidences.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Belum ada bukti audit pada standar ini.
                            </div>
                        ) : selectedEvidence ? (
                            previewLoading ? (
                                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                    Memuat preview...
                                </div>
                            ) : previewUrl ? (
                                <iframe title="Audit Preview" src={previewUrl} className="h-full w-full" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                    Preview tidak tersedia untuk bukti ini.
                                </div>
                            )
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Pilih dokumen dari daftar untuk melihat isi bukti.
                            </div>
                        )}
                    </div>
                </section>

                <aside className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Cari Standar</h3>
                            <p className="mt-1 text-sm text-gray-600">
                                {standard?.name || 'Standar tidak ditemukan'}
                            </p>
                        </div>
                        <div className="mt-4 relative">
                            <Icon icon={Icons.search} width={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={standardSearch}
                                onChange={(event) => setStandardSearch(event.target.value)}
                                placeholder="Cari isi standar..."
                                className="w-full rounded-2xl border border-gray-300 bg-white py-2 pl-11 pr-4 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                        </div>
                    </div>

                    <div className="h-[calc(100vh-17rem)] min-h-[70vh] overflow-y-auto bg-white px-5 py-5">
                        {standardTreeLoading ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Memuat struktur standar...
                            </div>
                        ) : filteredStandardTree.length > 0 ? (
                            <div className="space-y-3">
                                {renderMetricTree(filteredStandardTree, standardSearchTerms)}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                {standardSearch.trim() ? 'Tidak ada isi standar yang cocok dengan pencarian.' : 'Struktur standar belum tersedia.'}
                            </div>
                        )}
                    </div>
                </aside>

                {selectedEvidence && (
                    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Keputusan Review
                                </div>
                                <h2 className="mt-2 text-xl font-semibold text-gray-900">
                                    {selectedEvidence.title || selectedEvidence.original_name || selectedEvidence.link_url}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                    {selectedEvidence.metric?.content}
                                </p>
                            </div>
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selectedEvidence.review_status] || statusStyles.PENDING}`}>
                                {selectedEvidence.review_status}
                            </span>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Uploader</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{selectedEvidence.uploader?.name || '-'}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Jenis Bukti</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">
                                    {selectedEvidence.source_type === 'file' ? `${selectedEvidence.original_name} • ${formatBytes(selectedEvidence.size_bytes)}` : 'Link Dokumen'}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Reviewer Terakhir</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{selectedEvidence.reviewer?.name || '-'}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Waktu Review</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{formatDate(selectedEvidence.reviewed_at)}</div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="mb-2 block text-sm font-medium text-gray-700">
                                Temuan
                            </div>
                            <div className="space-y-4">
                                {findings.map((item, index) => (
                                    <div key={`finding-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Referensi Butir Mutu <span className="text-rose-600">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => openReferenceDialog(index)}
                                                    className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 transition hover:border-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                                >
                                                    <span className={item.referenceMetricId ? 'text-gray-900' : 'text-gray-500'}>
                                                        {(() => {
                                                            const selectedRow = referenceRows.find((row) => String(row.id) === String(item.referenceMetricId));

                                                            if (selectedRow) {
                                                                return `${selectedRow.iku !== '-' ? `IKU ${selectedRow.iku}` : 'Butir Mutu'}${selectedRow.ikt !== '-' ? ` / IKT ${selectedRow.ikt}` : ''} - ${selectedRow.statement}`;
                                                            }

                                                            if (item.referenceMetricId) {
                                                                const fallback = indicatorOptions.find((option) => String(option.id) === String(item.referenceMetricId));
                                                                return fallback?.label || `Butir mutu #${item.referenceMetricId}`;
                                                            }

                                                            return 'Pilih butir mutu';
                                                        })()}
                                                    </span>
                                                    <Icon icon={Icons.search} width={16} className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Pernyataan Temuan <span className="text-rose-600">*</span>
                                                </label>
                                                <textarea
                                                    rows="3"
                                                    value={item.statement}
                                                    onChange={(event) => updateFinding(index, 'statement', event.target.value)}
                                                    className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                                    placeholder="Tuliskan isi temuan untuk butir mutu ini."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={addFinding}
                                    className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                    <Icon icon={Icons.add} width={16} />
                                    Tambah Temuan
                                </button>
                            </div>
                        </div>

                        {canCreatePtk && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                <label className="flex items-start gap-3 text-sm text-amber-900">
                                    <input
                                        type="checkbox"
                                        checked={createPtkOnReject}
                                        onChange={(event) => setCreatePtkOnReject(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>
                                        Buat PTK dari temuan ini saat bukti ditolak. Aktifkan hanya jika auditor memutuskan temuan perlu tindak koreksi resmi.
                                    </span>
                                </label>
                            </div>
                        )}

                        {createPtkOnReject && (
                            <>
                                <div className="mt-6">
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Komentar Auditor <span className="text-rose-600">*</span>
                                    </label>
                                    <textarea
                                        rows="4"
                                        value={reviewComment}
                                        onChange={(event) => setReviewComment(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                        placeholder="Isi komentar revisi saat menolak, atau catatan akhir saat menerima."
                                    />
                                </div>

                                {canCreatePtk && (
                                    <div className="mt-6">
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Target Tanggal PTK <span className="text-rose-600">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={targetCompletionDate}
                                            onChange={(event) => setTargetCompletionDate(event.target.value)}
                                            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => submitReview('reject')}
                                disabled={submittingAction !== ''}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={submittingAction === 'reject' ? Icons.refresh : Icons.close} width={16} className={submittingAction === 'reject' ? 'animate-spin' : ''} />
                                {createPtkOnReject ? 'Tolak Bukti dan Buat PTK' : 'Tolak Bukti'}
                            </button>
                            <button
                                type="button"
                                onClick={() => submitReview('accept')}
                                disabled={submittingAction !== ''}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={submittingAction === 'accept' ? Icons.refresh : Icons.check} width={16} className={submittingAction === 'accept' ? 'animate-spin' : ''} />
                                Terima Bukti
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {referenceDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
                    <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Pilih Referensi Butir Mutu</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Cari butir mutu berdasarkan IKU, IKT, pernyataan, atau filter periode siklus.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setReferenceDialogOpen(false);
                                    setReferenceDialogIndex(null);
                                }}
                                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <Icon icon={Icons.close} width={20} />
                            </button>
                        </div>

                        <div className="grid gap-4 border-b border-gray-200 px-6 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
                            <div className="relative">
                                <Icon icon={Icons.search} width={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={referenceSearch}
                                    onChange={(event) => setReferenceSearch(event.target.value)}
                                    placeholder="Cari IKU, IKT, nama standar, atau pernyataan..."
                                    className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                />
                            </div>
                            <select
                                value={referencePeriodFilter}
                                onChange={(event) => setReferencePeriodFilter(event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            >
                                <option value="ALL">Semua Periode</option>
                                {referencePeriodOptions.map((period) => (
                                    <option key={period} value={period}>
                                        {period}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="max-h-[65vh] overflow-auto bg-white px-6 py-5">
                            {referenceRowsLoading ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                                    Memuat daftar butir mutu...
                                </div>
                            ) : filteredReferenceRows.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                                    Tidak ada butir mutu yang cocok.
                                </div>
                            ) : (
                                <table className="min-w-full border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_0_0_rgba(229,231,235,1)]">
                                        <tr>
                                            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">IKU</th>
                                            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">IKT</th>
                                            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Pernyataan</th>
                                            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standar</th>
                                            <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Periode</th>
                                            <th className="bg-gray-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {filteredReferenceRows.map((row) => (
                                            <tr key={`${row.standardId}-${row.id}`} className="hover:bg-gray-50">
                                                <td className="border-t border-gray-200 px-4 py-4 text-sm text-gray-700">{row.iku}</td>
                                                <td className="border-t border-gray-200 px-4 py-4 text-sm text-gray-700">{row.ikt}</td>
                                                <td className="border-t border-gray-200 px-4 py-4 text-sm leading-6 text-gray-700">{row.statement}</td>
                                                <td className="border-t border-gray-200 px-4 py-4 text-sm font-medium text-gray-900">{row.standardName}</td>
                                                <td className="border-t border-gray-200 px-4 py-4 text-sm text-gray-700">{row.period}</td>
                                                <td className="border-t border-gray-200 px-4 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => selectReferenceButir(row)}
                                                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                                    >
                                                        <Icon icon={Icons.check} width={14} />
                                                        Pilih
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
