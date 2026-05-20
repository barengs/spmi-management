import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { getCached } from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import { getApprovalStageLabel, getStandardStatusLabel, getStandardWrLabel } from '../../utils/standardStatus';

const getNodeTypeLabel = (type) => {
    if (type === 'Header') return 'Bab';
    if (type === 'Statement') return 'Pasal';
    return 'Indicator';
};

function flattenTree(nodes) {
    return nodes.flatMap((node) => [
        node,
        ...(node.children_recursive?.length > 0 ? flattenTree(node.children_recursive) : []),
    ]);
}

function buildComparisonSearchBlob(standard, tree) {
    const nodeTerms = flattenTree(tree).flatMap((node) => [
        node.content || '',
        getNodeTypeLabel(node.type),
        node.type || '',
    ]);

    return [
        standard.name || '',
        standard.category || '',
        standard.referensi_regulasi || '',
        String(standard.periode_tahun || ''),
        ...nodeTerms,
    ].join(' ').toLowerCase();
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

function statusBadge(status) {
    if (status === 'TERBIT') {
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }

    if (status === 'WAITING_APPROVAL') {
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }

    if (status === 'REVISI') {
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }

    return 'bg-amber-100 text-amber-800 border-amber-200';
}

function reviewNodeBadge(status) {
    if (status === 'REJECTED') {
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }

    if (status === 'ACCEPTED') {
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }

    return 'bg-gray-100 text-gray-700 border-gray-200';
}

function approvalProgressLabel(approvedAt, currentStage, nextStageLabel) {
    if (!approvedAt) {
        return 'Belum setuju';
    }

    if (currentStage === nextStageLabel) {
        return `Sudah setuju, dilanjutkan ke ${nextStageLabel === 'RECTOR' ? 'Rektor' : nextStageLabel}`;
    }

    return 'Sudah setuju';
}

function InfoCard({ label, value, hint, accent = 'gray' }) {
    const accentStyles = {
        blue: 'bg-blue-50 border-blue-100',
        emerald: 'bg-emerald-50 border-emerald-100',
        rose: 'bg-rose-50 border-rose-100',
        gray: 'bg-gray-50 border-gray-200',
    };

    return (
        <div className={`rounded-3xl border px-5 py-4 shadow-sm ${accentStyles[accent] || accentStyles.gray}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{value || '-'}</div>
            {hint && <div className="mt-1 text-xs leading-5 text-gray-500">{hint}</div>}
        </div>
    );
}

function MetricNodeCard({
    node,
    depth,
    reviewable,
    isExpanded,
    searchTerms,
    nodeDraft,
    nodeSubmittingId,
    onDraftChange,
    onAccept,
    onReject,
    onToggleExpand,
}) {
    const isRejected = node.review_status === 'REJECTED';
    const isSubmitting = nodeSubmittingId === node.id;

    return (
        <div className="space-y-2">
            <div
                className={`rounded-2xl border px-4 py-3 ${
                    isRejected
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-gray-200 bg-gray-50/70'
                }`}
                style={{ marginLeft: `${depth * 16}px` }}
            >
                <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        <span>{getNodeTypeLabel(node.type)}</span>
                        <span>ID {node.id}</span>
                        <span className={`rounded-full border px-2 py-0.5 ${reviewNodeBadge(node.review_status)}`}>
                            {node.review_status === 'REJECTED'
                                ? 'Revisi'
                                : node.review_status === 'ACCEPTED'
                                    ? 'Diterima'
                                    : 'Belum Dicek'}
                        </span>
                        {node.review_action && (
                            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-800">
                                {node.review_action === 'REMOVE' ? 'Harus Dihapus' : 'Harus Diubah'}
                            </span>
                        )}
                    </div>

                    {reviewable && (
                        <button
                            type="button"
                            onClick={() => onToggleExpand(node.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                            aria-label={isExpanded ? 'Sembunyikan form review node' : 'Tampilkan form review node'}
                            title={isExpanded ? 'Sembunyikan form review' : 'Tampilkan form review'}
                        >
                            <Icon icon={Icons.more} width={18} />
                        </button>
                    )}
                </div>

                <div className="text-sm leading-6 text-gray-800">{renderHighlightedText(node.content, searchTerms)}</div>

                {(node.review_comment || !reviewable) && node.review_comment && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-white/80 px-3 py-3 text-sm text-rose-900">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Komentar Reviewer</div>
                        <div className="mt-1 whitespace-pre-wrap leading-6">{node.review_comment}</div>
                    </div>
                )}

                {reviewable && isExpanded && (
                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                Komentar untuk Admin
                            </label>
                            <textarea
                                rows="3"
                                value={nodeDraft.comment}
                                onChange={(event) => onDraftChange(node.id, 'comment', event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Tulis catatan revisi spesifik untuk node atau header ini."
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => onReject(node, 'REMOVE')}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={isSubmitting ? Icons.refresh : Icons.delete} width={14} className={isSubmitting ? 'animate-spin' : ''} />
                                Should Remove
                            </button>
                            <button
                                type="button"
                                onClick={() => onReject(node, 'UPDATE')}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={isSubmitting ? Icons.refresh : Icons.edit} width={14} className={isSubmitting ? 'animate-spin' : ''} />
                                Should Change Content
                            </button>
                            <button
                                type="button"
                                onClick={() => onAccept(node)}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={isSubmitting ? Icons.refresh : Icons.check} width={14} className={isSubmitting ? 'animate-spin' : ''} />
                                Tandai Diterima
                            </button>
                        </div>

                        {node.type === 'Header' && (
                            <div className="text-xs leading-5 text-gray-500">
                                Jika bab ditolak, seluruh child node di bawah bab ini akan ikut ditandai revisi.
                            </div>
                        )}
                    </div>
                )}

                {reviewable && !isExpanded && (
                    <div className="mt-3 text-xs text-gray-500">
                        Klik tombol tiga titik untuk membuka form review node.
                    </div>
                )}
            </div>
        </div>
    );
}

function renderMetricTree(nodes, options, depth = 0) {
    const {
        reviewable,
        searchTerms,
        expandedNodeIds,
        nodeDrafts,
        nodeSubmittingId,
        onDraftChange,
        onAccept,
        onReject,
        onToggleExpand,
    } = options;

    return nodes.map((node) => (
        <div key={node.id} className="space-y-2">
            <MetricNodeCard
                node={node}
                depth={depth}
                reviewable={reviewable}
                isExpanded={Boolean(expandedNodeIds[node.id])}
                searchTerms={searchTerms}
                nodeDraft={nodeDrafts[node.id] || { comment: '', reviewAction: '' }}
                nodeSubmittingId={nodeSubmittingId}
                onDraftChange={onDraftChange}
                onAccept={onAccept}
                onReject={onReject}
                onToggleExpand={onToggleExpand}
            />
            {node.children_recursive?.length > 0 && renderMetricTree(node.children_recursive, options, depth + 1)}
        </div>
    ));
}

export default function StandardReviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const [standard, setStandard] = useState(null);
    const [availableComparisonStandards, setAvailableComparisonStandards] = useState([]);
    const [currentTree, setCurrentTree] = useState([]);
    const [previousStandard, setPreviousStandard] = useState(null);
    const [selectedPreviousStandardId, setSelectedPreviousStandardId] = useState('');
    const [previousTree, setPreviousTree] = useState([]);
    const [comparisonSearch, setComparisonSearch] = useState('');
    const [comparisonYearFilter, setComparisonYearFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [submittingAction, setSubmittingAction] = useState('');
    const [nodeSubmittingId, setNodeSubmittingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [nodeDrafts, setNodeDrafts] = useState({});
    const [expandedNodeIds, setExpandedNodeIds] = useState({});

    const userAccess = useMemo(() => {
        const roles = user?.roles || [];
        const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));

        return {
            canAuditReview: hasRole('SuperAdmin') || (user?.permissions || []).includes('standard.publish'),
            canFinalizeReview: hasRole('SuperAdmin')
                || hasRole('Pimpinan')
                || hasRole('Kepala LPMI')
                || hasRole('Wakil Rektor 1')
                || hasRole('Wakil Rektor 2')
                || hasRole('Wakil Rektor 3')
                || hasRole('Rektor'),
        };
    }, [user]);

    const rejectedNodes = useMemo(
        () => flattenTree(currentTree).filter((node) => node.review_status === 'REJECTED'),
        [currentTree]
    );

    const pendingNodes = useMemo(
        () => flattenTree(currentTree).filter((node) => node.review_status === 'PENDING'),
        [currentTree]
    );
    const totalCurrentNodes = useMemo(() => flattenTree(currentTree).length, [currentTree]);

    const canShowAuditControls = userAccess.canAuditReview && standard?.status === 'WAITING_APPROVAL' && !standard?.review_submitted_at;

    const comparisonCandidates = useMemo(() => (
        availableComparisonStandards
            .filter((item) => comparisonYearFilter === 'ALL' || String(item.periode_tahun || '') === comparisonYearFilter)
            .filter((item) => (
                (item.search_blob || '').includes(comparisonSearch.trim().toLowerCase())
            ))
    ), [availableComparisonStandards, comparisonSearch, comparisonYearFilter]);

    const comparisonYearOptions = useMemo(() => (
        Array.from(
            new Set(
                availableComparisonStandards
                    .map((item) => item.periode_tahun)
                    .filter((value) => value !== null && value !== undefined && value !== '')
            )
        ).sort((left, right) => Number(right) - Number(left))
    ), [availableComparisonStandards]);
    const comparisonSearchTerms = useMemo(() => getSearchTerms(comparisonSearch), [comparisonSearch]);

    const auditReviewLockReason = useMemo(() => {
        if (canShowAuditControls) {
            return '';
        }

        if (!userAccess.canAuditReview) {
            return 'Aksi review node hanya tampil untuk admin pengelola standar atau SuperAdmin.';
        }

        if (standard?.status !== 'WAITING_APPROVAL') {
            return 'Aksi review node hanya aktif saat standar berstatus WAITING_APPROVAL.';
        }

        if (standard?.review_submitted_at) {
            return 'Aksi review node dikunci karena hasil review auditor sudah dikirim ke Pimpinan.';
        }

        return 'Aksi review node sedang tidak tersedia.';
    }, [canShowAuditControls, standard?.review_submitted_at, standard?.status, userAccess.canAuditReview]);

    const fetchPageData = async () => {
        try {
            setLoading(true);
            const [standardResponse, treeResponse, standardsResponse] = await Promise.all([
                api.get(`/standards/${id}`),
                api.get(`/standards/${id}/metrics/tree`),
                getCached('/standards'),
            ]);

            const current = standardResponse.data.data;
            const nextCurrentTree = treeResponse.data.data || [];
            const allStandards = standardsResponse.data.data || [];
            const rawCandidates = allStandards
                .filter((item) => (
                    String(item.id) !== String(current.id)
                    && item.status === 'TERBIT'
                    && item.category === current.category
                ))
                .sort((a, b) => {
                    const nameScoreA = a.name === current.name ? 1 : 0;
                    const nameScoreB = b.name === current.name ? 1 : 0;

                    if (nameScoreA !== nameScoreB) {
                        return nameScoreB - nameScoreA;
                    }

                    return Number(b.periode_tahun) - Number(a.periode_tahun);
                });
            const candidateTrees = await Promise.allSettled(
                rawCandidates.map((item) => api.get(`/standards/${item.id}/metrics/tree`))
            );
            const candidates = rawCandidates.map((item, index) => {
                const result = candidateTrees[index];
                const tree = result.status === 'fulfilled' ? (result.value.data.data || []) : [];

                return {
                    ...item,
                    comparison_tree: tree,
                    search_blob: buildComparisonSearchBlob(item, tree),
                };
            });
            const previous = candidates[0] || null;

            setStandard(current);
            setAvailableComparisonStandards(candidates);
            setCurrentTree(nextCurrentTree);
            setPreviousStandard(previous);
            setSelectedPreviousStandardId(previous ? String(previous.id) : '');
            setRejectReason(current.reject_reason || '');

            const nextDrafts = {};
            flattenTree(nextCurrentTree).forEach((node) => {
                nextDrafts[node.id] = {
                    comment: node.review_comment || '',
                    reviewAction: node.review_action || '',
                };
            });
            setNodeDrafts(nextDrafts);
            setExpandedNodeIds({});
        } catch (error) {
            toast.error(error.response?.data?.message || 'Halaman review standar gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPageData();
    }, [id]);

    useEffect(() => {
        const selectedStandard = availableComparisonStandards.find((item) => String(item.id) === String(selectedPreviousStandardId)) || null;
        setPreviousStandard(selectedStandard);

        if (!selectedPreviousStandardId || !selectedStandard) {
            setPreviousTree([]);
            setComparisonLoading(false);
            return;
        }

        if (Array.isArray(selectedStandard.comparison_tree) && selectedStandard.comparison_tree.length > 0) {
            setPreviousTree(selectedStandard.comparison_tree);
            setComparisonLoading(false);
            return;
        }

        let isCancelled = false;

        const fetchPreviousTree = async () => {
            try {
                setComparisonLoading(true);
                const previousTreeResponse = await api.get(`/standards/${selectedPreviousStandardId}/metrics/tree`);

                if (!isCancelled) {
                    setPreviousTree(previousTreeResponse.data.data || []);
                }
            } catch (error) {
                if (!isCancelled) {
                    setPreviousTree([]);
                    toast.error(error.response?.data?.message || 'Struktur standar pembanding gagal dimuat.');
                }
            } finally {
                if (!isCancelled) {
                    setComparisonLoading(false);
                }
            }
        };

        fetchPreviousTree();

        return () => {
            isCancelled = true;
        };
    }, [availableComparisonStandards, selectedPreviousStandardId]);

    useEffect(() => {
        if (comparisonCandidates.length === 0) {
            if (selectedPreviousStandardId) {
                setSelectedPreviousStandardId('');
            }
            return;
        }

        const currentStillVisible = comparisonCandidates.some((item) => String(item.id) === String(selectedPreviousStandardId));
        if (!currentStillVisible) {
            setSelectedPreviousStandardId(String(comparisonCandidates[0].id));
        }
    }, [comparisonCandidates, selectedPreviousStandardId]);

    const handleDraftChange = (nodeId, key, value) => {
        setNodeDrafts((current) => ({
            ...current,
            [nodeId]: {
                ...(current[nodeId] || { comment: '', reviewAction: '' }),
                [key]: value,
            },
        }));
    };

    const handleToggleExpand = (nodeId) => {
        setExpandedNodeIds((current) => ({
            ...current,
            [nodeId]: !current[nodeId],
        }));
    };

    const handleNodeReject = async (node, reviewAction) => {
        const draft = nodeDrafts[node.id] || { comment: '', reviewAction: '' };

        if (!draft.comment.trim()) {
            toast.warning('Komentar reviewer wajib diisi sebelum menolak node.');
            return;
        }

        setNodeSubmittingId(node.id);

        try {
            const response = await api.patch(`/metrics/${node.id}/review`, {
                action: 'reject',
                comment: draft.comment,
                review_action: reviewAction,
            });

            setNodeDrafts((current) => ({
                ...current,
                [node.id]: {
                    ...(current[node.id] || { comment: '', reviewAction: '' }),
                    reviewAction,
                },
            }));

            toast.success(response.data.message);
            await fetchPageData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Review node gagal disimpan.');
        } finally {
            setNodeSubmittingId(null);
        }
    };

    const handleNodeAccept = async (node) => {
        setNodeSubmittingId(node.id);

        try {
            const response = await api.patch(`/metrics/${node.id}/review`, {
                action: 'accept',
            });

            toast.success(response.data.message);
            await fetchPageData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Status node gagal diperbarui.');
        } finally {
            setNodeSubmittingId(null);
        }
    };

    const handleApprove = async () => {
        setSubmittingAction('approve');

        try {
            const response = await api.patch(`/standards/${id}/approve`);
            toast.success(response.data.message);
            navigate('/standards');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyetujui standar.');
        } finally {
            setSubmittingAction('');
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.warning('Alasan penolakan wajib diisi.');
            return;
        }

        if (rejectedNodes.length === 0) {
            toast.warning('Tandai minimal satu header atau node sebagai revisi sebelum mengembalikan standar.');
            return;
        }

        setSubmittingAction('reject');

        try {
            const response = await api.patch(`/standards/${id}/reject`, { reason: rejectReason });
            toast.success(response.data.message);
            navigate('/standards');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menolak standar.');
        } finally {
            setSubmittingAction('');
        }
    };

    const handleSubmitToPimpinan = async () => {
        setSubmittingAction('submit-review');

        try {
            const response = await api.patch(`/standards/${id}/submit-review`);
            toast.success(response.data.message);
            await fetchPageData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengirim hasil review auditor.');
        } finally {
            setSubmittingAction('');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-sm text-gray-500">Memuat review standar...</div>;
    }

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                            <Icon icon={Icons.standard} width={14} />
                            Detail Review Standar
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{standard?.name || 'Standar Mutu'}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Review dilakukan per header atau per node. Standar hanya bisa diterbitkan jika tidak ada node yang masih ditandai revisi.
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

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <InfoCard
                    label="Periode Diajukan"
                    value={standard?.periode_tahun}
                    hint="Periode standar yang sedang direview."
                    accent="blue"
                />
                <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Status</div>
                    <div className="mt-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(standard?.status)}`}>
                            {getStandardStatusLabel(standard)}
                        </span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-gray-500">
                        Tahap aktif: {getApprovalStageLabel(standard?.approval_stage, standard)}
                    </div>
                </div>
                <InfoCard
                    label="Standar Diajukan"
                    value={standard?.name}
                    hint={standard?.referensi_regulasi || 'Belum ada referensi regulasi.'}
                    accent="emerald"
                />
                <InfoCard
                    label="Standar Pembanding"
                    value={previousStandard?.name || 'Belum tersedia'}
                    hint={previousStandard ? `Tahun ${previousStandard.periode_tahun || '-'} • Mode baca pembanding` : 'Pilih standar terbit lain untuk dijadikan pembanding.'}
                    accent="rose"
                />
                <InfoCard
                    label="Node Revisi"
                    value={String(rejectedNodes.length)}
                    hint="Jumlah header/node yang masih ditolak reviewer."
                    accent={rejectedNodes.length > 0 ? 'rose' : 'emerald'}
                />
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Standar Diajukan Admin</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Reviewer dapat memberi komentar per header atau node, lalu memilih apakah item harus dihapus atau cukup diubah.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Periode Aktif</div>
                                <div className="mt-1 text-sm font-semibold text-emerald-900">{standard?.periode_tahun || '-'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="h-[calc(100vh-21rem)] min-h-[32rem] overflow-y-auto px-5 py-5">
                        {!canShowAuditControls && auditReviewLockReason && (
                            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                {auditReviewLockReason}
                            </div>
                        )}

                        {currentTree.length > 0 ? (
                            <div className="space-y-3">
                                {renderMetricTree(currentTree, {
                                    reviewable: canShowAuditControls,
                                    searchTerms: [],
                                    expandedNodeIds,
                                    nodeDrafts,
                                    nodeSubmittingId,
                                    onDraftChange: handleDraftChange,
                                    onAccept: handleNodeAccept,
                                    onReject: handleNodeReject,
                                    onToggleExpand: handleToggleExpand,
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                                Struktur standar yang diajukan belum tersedia.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 px-5 py-4">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Standar Pembanding</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Pimpinan dapat memilih standar terbit sebelumnya sebagai pembanding dalam mode baca.
                                </p>
                            </div>
                    </div>
                    <div className="h-[calc(100vh-21rem)] min-h-[32rem] overflow-y-auto px-5 py-5">
                        <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                                <input
                                    type="text"
                                    value={comparisonSearch}
                                    onChange={(event) => setComparisonSearch(event.target.value)}
                                    placeholder="Cari nama standar pembanding..."
                                    className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <select
                                    value={comparisonYearFilter}
                                    onChange={(event) => setComparisonYearFilter(event.target.value)}
                                    className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="ALL">Semua Tahun</option>
                                    {comparisonYearOptions.map((year) => (
                                        <option key={year} value={String(year)}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                <select
                                    value={selectedPreviousStandardId}
                                    onChange={(event) => setSelectedPreviousStandardId(event.target.value)}
                                    className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="">Pilih standar pembanding</option>
                                    {comparisonCandidates.map((item) => (
                                        <option key={item.id} value={String(item.id)}>
                                            {item.name} ({item.periode_tahun || '-'})
                                        </option>
                                    ))}
                                </select>
                                <div className="text-xs text-gray-500">
                                    {comparisonCandidates.length} standar tersedia
                                </div>
                            </div>
                        </div>

                        {previousStandard ? (
                            comparisonLoading ? (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                                    Memuat struktur standar pembanding...
                                </div>
                            ) : previousTree.length > 0 ? (
                                <div className="space-y-3">
                                    {renderMetricTree(previousTree, {
                                        reviewable: false,
                                        searchTerms: comparisonSearchTerms,
                                        expandedNodeIds: {},
                                        nodeDrafts: {},
                                        nodeSubmittingId: null,
                                        onDraftChange: () => {},
                                        onAccept: () => {},
                                        onReject: () => {},
                                        onToggleExpand: () => {},
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                                    Struktur standar pembanding tidak ditemukan.
                                </div>
                            )
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                                Pilih salah satu standar terbit pada daftar di atas untuk dijadikan pembanding.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Keputusan Review</div>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900">Persetujuan Berjenjang</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Alur penetapan standar berjalan dari Kepala LPMI, lalu Wakil Rektor sesuai kategori standar, kemudian Rektor. Standar baru langsung berlaku setelah Rektor menyetujui.
                    </p>

                    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">Ringkasan Review</div>
                        <div className="mt-2">Node revisi aktif: {rejectedNodes.length}</div>
                        <div className="mt-1">Node belum dicek auditor: {pendingNodes.length}</div>
                        <div className="mt-1">Total node standar diajukan: {totalCurrentNodes}</div>
                        <div className="mt-1">Tahap persetujuan aktif: {getApprovalStageLabel(standard?.approval_stage, standard)}</div>
                        <div className="mt-1">Kepala LPMI: {approvalProgressLabel(standard?.head_lpmi_approved_at, standard?.approval_stage, 'WR')}</div>
                        <div className="mt-1">
                            {getStandardWrLabel(standard)}: {
                                approvalProgressLabel(
                                    getStandardWrLabel(standard) === 'Wakil Rektor 3'
                                        ? standard?.wr3_approved_at
                                        : getStandardWrLabel(standard) === 'Wakil Rektor 2'
                                            ? standard?.wr2_approved_at
                                            : standard?.wr1_approved_at,
                                    standard?.approval_stage,
                                    'RECTOR'
                                )
                            }
                        </div>
                        <div className="mt-1">Rektor: {standard?.rector_approved_at ? 'Sudah setuju' : 'Belum setuju'}</div>
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Catatan Umum untuk Admin
                        </label>
                        <textarea
                            rows="4"
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            disabled={!userAccess.canFinalizeReview || standard?.status !== 'WAITING_APPROVAL' || submittingAction !== ''}
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50"
                            placeholder="Rangkum konteks revisi umum yang perlu diperhatikan admin."
                        />
                    </div>

                    {userAccess.canFinalizeReview && standard?.status === 'WAITING_APPROVAL' && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={submittingAction !== '' || !rejectReason.trim()}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={submittingAction === 'reject' ? Icons.refresh : Icons.close} width={16} className={submittingAction === 'reject' ? 'animate-spin' : ''} />
                                Kembalikan untuk Revisi
                            </button>
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={submittingAction !== ''}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={submittingAction === 'approve' ? Icons.refresh : Icons.check} width={16} className={submittingAction === 'approve' ? 'animate-spin' : ''} />
                                Setujui Tahap Ini
                            </button>
                        </div>
                    )}
                {standard?.reject_reason && (
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                        <div className="font-semibold">Catatan Revisi Terakhir</div>
                        <div className="mt-2 leading-6">{standard.reject_reason}</div>
                    </div>
                )}
            </section>
        </div>
    );
}
