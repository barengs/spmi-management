import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import { getApprovalStageLabel, getStandardStatusLabel, getStandardWrLabel, normalizeStandardCategory } from '../../utils/standardStatus';

const tabs = [
    { id: 'information', label: 'Informasi' },
    { id: 'structure', label: 'Struktur' },
    { id: 'history', label: 'Riwayat' },
    { id: 'document', label: 'Dokumen' },
    { id: 'settings', label: 'Pengaturan' },
];

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatFileSize(value) {
    if (!value || Number(value) <= 0) {
        return '-';
    }

    const size = Number(value);

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getNodeTypeLabel(type) {
    if (type === 'Header') return 'Poin Utama';
    if (type === 'Statement') return 'Sub Poin';
    return 'Isi';
}

function flattenNodes(nodes) {
    return (nodes || []).flatMap((node) => [
        node,
        ...(node.children_recursive?.length ? flattenNodes(node.children_recursive) : []),
    ]);
}

function buildHistoryItems(standard) {
    if (!standard) {
        return [];
    }

    const wrLabel = getStandardWrLabel(standard);
    const wrApprovedAt = wrLabel === 'Wakil Rektor 3'
        ? standard.wr3_approved_at
        : wrLabel === 'Wakil Rektor 2'
            ? standard.wr2_approved_at
            : standard.wr1_approved_at;

    const items = [
        {
            key: 'created',
            label: 'Standar dibuat',
            time: standard.created_at,
            tone: 'green',
            description: `Dokumen standar ${standard.name || ''} dibuat di sistem.`,
        },
    ];

    if (standard.submitted_at || standard.status === 'WAITING_APPROVAL' || standard.status === 'TERBIT') {
        items.push({
            key: 'submitted',
            label: 'Diajukan',
            time: standard.updated_at,
            tone: standard.approval_stage === 'HEAD_LPMI' ? 'yellow' : 'green',
            description: 'Standar diajukan ke alur persetujuan berjenjang.',
        });
    }

        items.push({
            key: 'head-lpmi',
            label: 'Persetujuan Kepala LPMI',
            time: standard.head_lpmi_approved_at,
            tone: standard.reject_reason
                ? 'red'
                : standard.head_lpmi_approved_at
                    ? 'green'
                    : standard.approval_stage === 'HEAD_LPMI'
                        ? 'yellow'
                        : 'gray',
            description: standard.head_lpmi_approved_at
                ? 'Kepala LPMI sudah menyetujui standar.'
                : 'Menunggu persetujuan Kepala LPMI.',
        });

        items.push({
            key: 'wr1',
            label: `Persetujuan ${wrLabel}`,
            time: wrApprovedAt,
            tone: standard.reject_reason
                ? 'red'
                : wrApprovedAt
                    ? 'green'
                    : standard.approval_stage === 'WR'
                        ? 'yellow'
                        : 'gray',
            description: wrApprovedAt
                ? `${wrLabel} sudah menyetujui standar.`
                : `Menunggu persetujuan ${wrLabel}.`,
        });

    items.push({
        key: 'rector',
        label: 'Persetujuan Rektor',
        time: standard.rector_approved_at,
        tone: standard.reject_reason
            ? 'red'
            : standard.rector_approved_at
                ? 'green'
                : standard.approval_stage === 'RECTOR'
                    ? 'yellow'
                    : 'gray',
        description: standard.rector_approved_at
            ? 'Rektor sudah menyetujui standar.'
            : 'Menunggu persetujuan Rektor.',
    });

    if (standard.reject_reason) {
        items.push({
            key: 'rejected',
            label: 'Dikembalikan untuk revisi',
            time: standard.updated_at,
            tone: 'red',
            description: standard.reject_reason,
        });
    }

    if (standard.status === 'TERBIT') {
        items.push({
            key: 'final',
            label: 'Standar diterbitkan',
            time: standard.rector_approved_at || standard.updated_at,
            tone: 'green',
            description: 'Seluruh tahap persetujuan selesai dan standar telah berstatus TERBIT.',
        });
    }

    return items;
}

function SummaryCard({ label, value, hint }) {
    return (
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="mt-2 text-sm font-semibold text-slate-100">{value || '-'}</div>
            {hint ? <div className="mt-1 text-xs leading-5 text-slate-400">{hint}</div> : null}
        </div>
    );
}

function StructureNode({ node, depth = 0 }) {
    return (
        <div className="space-y-3">
            <div
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3"
                style={{ marginLeft: `${depth * 18}px` }}
            >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span>{getNodeTypeLabel(node.type)}</span>
                    <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">
                        {node.review_status || 'ACCEPTED'}
                    </span>
                </div>
                <div className="text-sm leading-6 text-slate-100">{node.content || '-'}</div>
            </div>

            {node.children_recursive?.length ? (
                <div className="space-y-3">
                    {node.children_recursive.map((child) => (
                        <StructureNode key={child.id} node={child} depth={depth + 1} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function StandardDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const user = useSelector((state) => state.auth.user);
    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);
    const hasRole = (roleName) => roleNames.includes(roleName);
    const canDraftStandard = hasRole('SuperAdmin')
        || user?.permissions?.includes('standard.create')
        || user?.permissions?.includes('standard.update');
    const canDeleteStandard = hasRole('SuperAdmin') || user?.permissions?.includes('standard.delete');
    const canExportStandard = hasRole('SuperAdmin') || user?.permissions?.includes('report.export');
    const [standard, setStandard] = useState(null);
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('information');
    const [documentBlobUrl, setDocumentBlobUrl] = useState(null);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [settingsSubmitting, setSettingsSubmitting] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        name: '',
        category: 'Tambahan',
        periode_tahun: '',
        referensi_regulasi: '',
        is_active: true,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [standardResponse, treeResponse] = await Promise.all([
                    api.get(`/standards/${id}`),
                    api.get(`/standards/${id}/metrics/tree`),
                ]);

                setStandard(standardResponse.data.data || null);
                setTree(treeResponse.data.data || []);
                setSettingsForm({
                    name: standardResponse.data.data?.name || '',
                    category: standardResponse.data.data?.category || 'Tambahan',
                    periode_tahun: standardResponse.data.data?.periode_tahun || '',
                    referensi_regulasi: standardResponse.data.data?.referensi_regulasi || '',
                    is_active: Boolean(standardResponse.data.data?.is_active),
                });
            } catch (error) {
                toast.error(error.response?.data?.message || 'Detail standar gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        if (!standard?.source_document_path) {
            setDocumentBlobUrl((current) => {
                if (current) {
                    URL.revokeObjectURL(current);
                }

                return null;
            });
            setDocumentLoading(false);
            return undefined;
        }

        let isMounted = true;
        let nextBlobUrl = null;

        const fetchDocument = async () => {
            try {
                setDocumentLoading(true);
                const response = await api.get(`/standards/${standard.id}/source-document/download`, {
                    responseType: 'blob',
                });

                if (!isMounted) {
                    return;
                }

                nextBlobUrl = window.URL.createObjectURL(response.data);
                setDocumentBlobUrl((current) => {
                    if (current) {
                        window.URL.revokeObjectURL(current);
                    }

                    return nextBlobUrl;
                });
            } catch (error) {
                if (isMounted) {
                    toast.error(error.response?.data?.message || 'Dokumen sumber gagal dimuat.');
                }
            } finally {
                if (isMounted) {
                    setDocumentLoading(false);
                }
            }
        };

        fetchDocument();

        return () => {
            isMounted = false;

            if (nextBlobUrl) {
                window.URL.revokeObjectURL(nextBlobUrl);
            }
        };
    }, [standard?.id, standard?.source_document_path]);

    const flattenedTree = useMemo(() => flattenNodes(tree), [tree]);
    const historyItems = useMemo(() => buildHistoryItems(standard), [standard]);
    const isDraft = standard?.status === 'DRAFT';

    const handleExport = async () => {
        if (!standard) {
            return;
        }

        try {
            const response = await api.get(`/standards/${standard.id}/export`, {
                responseType: 'blob',
            });
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const contentDisposition = response.headers['content-disposition'] || '';
            const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
            const fallbackExtension = contentType.includes('pdf')
                ? 'pdf'
                : contentType.includes('word') || contentType.includes('msword')
                    ? 'doc'
                    : 'bin';
            const fileName = fileNameMatch?.[1]
                || `${(standard.name || 'standar').replace(/[\\/:*?"<>|]+/g, '-')}-${standard.periode_tahun || 'tanpa-periode'}.${fallbackExtension}`;
            const blob = new Blob([response.data], { type: contentType });
            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ekspor standar gagal dijalankan.');
        }
    };

    const handleSettingsChange = (field, value) => {
        setSettingsForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSettingsSubmit = async (event) => {
        event.preventDefault();

        if (!isDraft) {
            toast.warning('Pengaturan standar hanya dapat diubah saat status masih DRAFT.');
            return;
        }

        try {
            setSettingsSubmitting(true);
            const response = await api.put(`/standards/${standard.id}`, settingsForm);
            setStandard(response.data.data || null);
            toast.success(response.data.message || 'Standar berhasil diperbarui.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Standar gagal diperbarui.');
        } finally {
            setSettingsSubmitting(false);
        }
    };

    const handleDeleteStandard = async () => {
        if (!isDraft) {
            toast.warning('Standar hanya dapat dihapus saat status masih DRAFT.');
            return;
        }

        if (!window.confirm(`Hapus standar "${standard?.name}"?`)) {
            return;
        }

        try {
            setSettingsSubmitting(true);
            const response = await api.delete(`/standards/${standard.id}`);
            toast.success(response.data.message || 'Standar berhasil dihapus.');
            navigate('/standards');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Standar gagal dihapus.');
        } finally {
            setSettingsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-sm text-slate-500">Memuat detail standar...</div>;
    }

    if (!standard) {
        return (
            <div className="space-y-4 p-6 sm:p-8">
                <Link to="/standards" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    Kembali ke daftar standar
                </Link>
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
                    Standar tidak ditemukan.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link to="/standards" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                        Kembali ke daftar standar
                    </Link>
                    <h1 className="mt-3 text-2xl font-semibold text-slate-900">{standard.name}</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        {normalizeStandardCategory(standard.category)} | Periode {standard.periode_tahun || '-'} | {getStandardStatusLabel(standard)}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {canDraftStandard && (standard.status === 'DRAFT' || standard.status === 'REVISI') && (
                        <Link
                            to={`/standards/${standard.id}/builder`}
                            className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 transition hover:bg-amber-100"
                        >
                            <Icon icon={Icons.edit} width={14} />
                            Builder
                        </Link>
                    )}
                    {canExportStandard && standard.status === 'TERBIT' && (
                        <button
                            type="button"
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 transition hover:bg-emerald-100"
                        >
                            <Icon icon={Icons.document} width={14} />
                            Export
                        </button>
                    )}
                    <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-sm">
                        {getApprovalStageLabel(standard.approval_stage, standard)}
                    </div>
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Status" value={getStandardStatusLabel(standard)} />
                <SummaryCard label="Tahap Approval" value={getApprovalStageLabel(standard.approval_stage, standard)} />
                <SummaryCard label="Jumlah Node" value={String(flattenedTree.length)} hint="Total poin utama, sub poin, dan isi." />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-sm">
                <div className="border-b border-slate-800 px-4 sm:px-6">
                    <div className="flex flex-wrap gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? 'border-emerald-400 text-slate-100'
                                        : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-5 sm:p-6">
                    {activeTab === 'information' && (
                        <section className="grid gap-4 lg:grid-cols-2">
                            <SummaryCard label="Nama Standar" value={standard.name} />
                            <SummaryCard label="Kategori" value={normalizeStandardCategory(standard.category)} />
                            <SummaryCard label="Periode Tahun" value={String(standard.periode_tahun || '-')} />
                            <SummaryCard label="Referensi Regulasi" value={standard.referensi_regulasi || '-'} />
                            <SummaryCard label="Dibuat" value={formatDateTime(standard.created_at)} />
                            <SummaryCard label="Terakhir Diubah" value={formatDateTime(standard.updated_at)} />
                            <SummaryCard label="Sumber Dokumen" value={standard.source_document_original_name || 'Manual dari sistem'} />
                            <SummaryCard
                                label="Ukuran Dokumen"
                                value={formatFileSize(standard.source_document_size_bytes)}
                                hint={standard.imported_from_document_at ? `Diimpor pada ${formatDateTime(standard.imported_from_document_at)}` : null}
                            />
                            {standard.reject_reason ? (
                                <div className="rounded-3xl border border-rose-900 bg-rose-950/60 p-5 text-sm text-rose-100 shadow-sm lg:col-span-2">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">Catatan Revisi</div>
                                    <div className="mt-2 leading-6">{standard.reject_reason}</div>
                                </div>
                            ) : null}
                        </section>
                    )}

                    {activeTab === 'structure' && (
                        <section className="space-y-4">
                            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                <div className="text-sm text-slate-300">
                                    Struktur standar menampilkan susunan `Poin Utama`, `Sub Poin`, dan `Isi` yang tersimpan pada dokumen ini.
                                </div>
                            </div>

                            <div className="space-y-3">
                                {tree.length > 0 ? tree.map((node) => (
                                    <StructureNode key={node.id} node={node} />
                                )) : (
                                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-10 text-center text-sm text-slate-400">
                                        Struktur standar belum tersedia.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'history' && (
                        <section className="space-y-6">
                            {historyItems.map((item, index) => (
                                <div key={item.key} className="flex gap-4">
                                    <div className="flex w-8 flex-col items-center">
                                        <div
                                            className={`mt-1 h-3 w-3 rounded-full ${
                                                item.tone === 'green'
                                                    ? 'bg-emerald-500'
                                                    : item.tone === 'red'
                                                        ? 'bg-rose-500'
                                                        : item.tone === 'yellow'
                                                            ? 'bg-amber-500'
                                                            : 'bg-slate-400'
                                            }`}
                                        />
                                        {index !== historyItems.length - 1 ? <div className="mt-2 w-px flex-1 bg-slate-700" /> : null}
                                    </div>
                                    <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                                            <div className="text-xs text-slate-400">{formatDateTime(item.time)}</div>
                                        </div>
                                        <div className="mt-2 text-sm leading-6 text-slate-300">{item.description}</div>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {activeTab === 'document' && (
                        <section className="space-y-4">
                            {standard?.source_document_path ? (
                                <>
                                    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-100">
                                                    {standard.source_document_original_name || 'Dokumen sumber'}
                                                </div>
                                                <div className="mt-1 text-sm text-slate-400">
                                                    Dokumen asli yang diunggah saat import standar ditampilkan langsung di bawah ini.
                                                </div>
                                            </div>
                                            <a
                                                href={documentBlobUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                download={standard.source_document_original_name || 'dokumen-standar.pdf'}
                                                onClick={(event) => {
                                                    if (!documentBlobUrl) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
                                            >
                                                <Icon icon={Icons.document} width={14} />
                                                Unduh Dokumen
                                            </a>
                                        </div>
                                    </div>

                                    {documentLoading ? (
                                        <div className="rounded-3xl border border-slate-700 bg-slate-900 px-6 py-10 text-center text-sm text-slate-400">
                                            Memuat dokumen sumber...
                                        </div>
                                    ) : documentBlobUrl ? (
                                        <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900">
                                            <iframe
                                                title={standard.source_document_original_name || 'Dokumen standar'}
                                                src={documentBlobUrl}
                                                className="h-[70vh] w-full bg-white"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-10 text-center text-sm text-slate-400">
                                            Preview dokumen belum tersedia.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-10 text-center text-sm text-slate-400">
                                    Standar ini tidak memiliki dokumen sumber yang diunggah.
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'settings' && (
                        <section className="space-y-6">
                            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                <div className="text-sm font-semibold text-slate-100">Pengaturan Standar</div>
                                <div className="mt-2 text-sm leading-6 text-slate-400">
                                    Edit dan hapus standar hanya tersedia saat status masih `DRAFT`.
                                </div>
                            </div>

                            <form onSubmit={handleSettingsSubmit} className="grid gap-4 lg:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-slate-300">Nama Standar</span>
                                    <input
                                        type="text"
                                        value={settingsForm.name}
                                        onChange={(event) => handleSettingsChange('name', event.target.value)}
                                        disabled={!isDraft || settingsSubmitting}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-slate-300">Kategori</span>
                                    <select
                                        value={settingsForm.category}
                                        onChange={(event) => handleSettingsChange('category', event.target.value)}
                                        disabled={!isDraft || settingsSubmitting}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="Pendidikan">Pendidikan</option>
                                        <option value="Penelitian">Penelitian</option>
                                        <option value="Pengabdian">Pengabdian</option>
                                        <option value="Tambahan">Tambahan</option>
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-slate-300">Periode Tahun</span>
                                    <input
                                        type="number"
                                        value={settingsForm.periode_tahun}
                                        onChange={(event) => handleSettingsChange('periode_tahun', event.target.value)}
                                        disabled={!isDraft || settingsSubmitting}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-slate-300">Status Aktif</span>
                                    <select
                                        value={settingsForm.is_active ? '1' : '0'}
                                        onChange={(event) => handleSettingsChange('is_active', event.target.value === '1')}
                                        disabled={!isDraft || settingsSubmitting}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="1">Aktif</option>
                                        <option value="0">Nonaktif</option>
                                    </select>
                                </label>

                                <label className="space-y-2 lg:col-span-2">
                                    <span className="text-sm font-medium text-slate-300">Referensi Regulasi</span>
                                    <textarea
                                        rows="4"
                                        value={settingsForm.referensi_regulasi}
                                        onChange={(event) => handleSettingsChange('referensi_regulasi', event.target.value)}
                                        disabled={!isDraft || settingsSubmitting}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </label>

                                <div className="flex flex-wrap gap-3 lg:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={!isDraft || settingsSubmitting}
                                        className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Simpan Perubahan
                                    </button>
                                    {canDeleteStandard && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteStandard}
                                            disabled={!isDraft || settingsSubmitting}
                                            className="rounded-full border border-rose-700 bg-rose-950/60 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Hapus Standar
                                        </button>
                                    )}
                                </div>
                            </form>

                            {!isDraft && (
                                <div className="rounded-3xl border border-amber-800 bg-amber-950/40 p-5 text-sm text-amber-100">
                                    Pengaturan dikunci karena standar ini sudah tidak berada pada status `DRAFT`.
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </section>
        </div>
    );
}
