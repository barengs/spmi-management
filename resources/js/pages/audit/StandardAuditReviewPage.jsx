import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
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

function renderMetricTree(nodes, selectedMetricId, depth = 0) {
    return nodes.map((node) => {
        const isSelected = node.id === selectedMetricId;

        return (
            <div key={node.id} className="space-y-2">
                <div
                    className={`rounded-2xl border px-4 py-3 ${
                        isSelected ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50/70'
                    }`}
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        <span>{node.type}</span>
                        {isSelected && (
                            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">
                                Bukti Aktif
                            </span>
                        )}
                    </div>
                    <div className="text-sm leading-6 text-gray-800">{node.content}</div>
                </div>

                {node.children_recursive?.length > 0 && renderMetricTree(node.children_recursive, selectedMetricId, depth + 1)}
            </div>
        );
    });
}

export default function StandardAuditReviewPage() {
    const { standardId } = useParams();
    const navigate = useNavigate();
    const [standard, setStandard] = useState(null);
    const [evidences, setEvidences] = useState([]);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [standardTree, setStandardTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [standardTreeLoading, setStandardTreeLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [submittingAction, setSubmittingAction] = useState('');

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
            return;
        }

        setReviewComment(selectedEvidence.review_status === 'REJECTED' ? (selectedEvidence.review_comment || '') : '');
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

    const submitReview = async (action) => {
        if (!selectedEvidence) {
            return;
        }

        if (action === 'reject' && !reviewComment.trim()) {
            toast.warning('Komentar auditor wajib diisi saat menolak bukti.');
            return;
        }

        setSubmittingAction(action);

        try {
            const response = await api.patch(`/evidences/${selectedEvidence.id}/review`, {
                action,
                comment: reviewComment,
            });

            toast.success(response.data.message);
            navigate('/audit');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Aksi review gagal diproses.');
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
                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Dokumen</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">{evidences.length} item</span>
                            <Link
                                to="/audit"
                                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.back} width={14} />
                                Semua Dokumen
                            </Link>
                        </div>
                    </div>

                    {evidences.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Belum ada bukti audit pada standar ini.
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-2">
                            <div className="flex min-w-max gap-3">
                                {evidences.map((evidence) => (
                                    <button
                                        key={evidence.id}
                                        type="button"
                                        onClick={() => setSelectedEvidence(evidence)}
                                        className={`w-[320px] shrink-0 rounded-2xl border px-4 py-4 text-left transition ${
                                            selectedEvidence?.id === evidence.id
                                                ? 'border-rose-300 bg-rose-50'
                                                : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-gray-900">
                                                    {evidence.title || evidence.original_name || evidence.link_url}
                                                </div>
                                                <div className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                    {evidence.metric?.content || 'Indicator tidak ditemukan'}
                                                </div>
                                            </div>
                                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[evidence.review_status] || statusStyles.PENDING}`}>
                                                {evidence.review_status}
                                            </span>
                                        </div>
                                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                                            <div>Uploader: {evidence.uploader?.name || '-'}</div>
                                            <div>
                                                {evidence.source_type === 'file'
                                                    ? `${evidence.original_name} • ${formatBytes(evidence.size_bytes)}`
                                                    : 'Link Dokumen'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

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
                    </div>
                    <div className="h-[70vh] bg-gray-100">
                        {selectedEvidence ? (
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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Standar Pembanding</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    {standard?.name || 'Standar tidak ditemukan'}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-gray-100 px-3 py-2 text-right">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Indikator Direview</div>
                                <div className="mt-1 text-sm font-medium text-gray-800">
                                    #{selectedEvidence?.metric?.id || '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[calc(100vh-17rem)] min-h-[70vh] overflow-y-auto bg-white px-5 py-5">
                        {standardTreeLoading ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Memuat struktur standar...
                            </div>
                        ) : standardTree.length > 0 ? (
                            <div className="space-y-3">
                                {renderMetricTree(standardTree, selectedEvidence?.metric?.id)}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Struktur standar belum tersedia.
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
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Komentar Auditor
                            </label>
                            <textarea
                                rows="4"
                                value={reviewComment}
                                onChange={(event) => setReviewComment(event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                placeholder="Isi komentar revisi saat menolak, atau catatan akhir saat menerima."
                            />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => submitReview('reject')}
                                disabled={submittingAction !== ''}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={submittingAction === 'reject' ? Icons.refresh : Icons.close} width={16} className={submittingAction === 'reject' ? 'animate-spin' : ''} />
                                Tolak dan Kirim Komentar
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
        </div>
    );
}
