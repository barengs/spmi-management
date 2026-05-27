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
    { id: 'improvement', label: 'Peningkatan' },
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
    const [improvementLoading, setImprovementLoading] = useState(false);
    const [improvementSubmitting, setImprovementSubmitting] = useState(false);
    const [improvementContext, setImprovementContext] = useState({ findings: [], improvements: [] });
    const [improvementForm, setImprovementForm] = useState({
        action: 'REVISI',
        justification: '',
        target_period_year: String(new Date().getFullYear() + 1),
        finding_ptk_id: '',
    });
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

    useEffect(() => {
        if (activeTab !== 'improvement') {
            return;
        }

        const fetchImprovementContext = async () => {
            try {
                setImprovementLoading(true);
                const response = await api.get(`/improvements?standard_id=${id}`);
                const payload = response.data.data || {};
                setImprovementContext({
                    findings: payload.findings || [],
                    improvements: payload.improvements || [],
                });
                setImprovementForm((current) => ({
                    ...current,
                    finding_ptk_id: current.finding_ptk_id || String(payload.findings?.[0]?.id || ''),
                    target_period_year: current.target_period_year || String((standard?.periode_tahun || new Date().getFullYear()) + 1),
                }));
            } catch (error) {
                toast.error(error.response?.data?.message || 'Data peningkatan standar gagal dimuat.');
            } finally {
                setImprovementLoading(false);
            }
        };

        fetchImprovementContext();
    }, [activeTab, id, standard?.periode_tahun]);

    const flattenedTree = useMemo(() => flattenNodes(tree), [tree]);
    const historyItems = useMemo(() => buildHistoryItems(standard), [standard]);
    const isDraft = standard?.status === 'DRAFT';
    const isImprovementLocked = standard?.status !== 'TERBIT' || !standard?.implementation_summary?.is_implemented;
    const improvementActionLabels = {
        REVISI: 'Perlu diperbaiki dan diterapkan lagi',
        PERTAHANKAN: 'Tetap dipakai pada siklus berikutnya',
        HAPUS: 'Tidak dipakai lagi pada siklus berikutnya',
    };

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

    const handleImprovementSubmit = async (event) => {
        event.preventDefault();

        if (!improvementForm.justification.trim()) {
            toast.warning('Catatan peningkatan wajib diisi.');
            return;
        }

        try {
            setImprovementSubmitting(true);
            const response = await api.post('/improvements', {
                standard_id: Number(id),
                finding_ptk_id: improvementForm.finding_ptk_id ? Number(improvementForm.finding_ptk_id) : null,
                action: improvementForm.action,
                justification: improvementForm.justification.trim(),
                target_period_year: improvementForm.action === 'REVISI' ? Number(improvementForm.target_period_year) : null,
            });

            toast.success(response.data.message || 'Catatan peningkatan berhasil disimpan.');

            const [standardResponse, improvementResponse] = await Promise.all([
                api.get(`/standards/${id}`),
                api.get(`/improvements?standard_id=${id}`),
            ]);

            setStandard(standardResponse.data.data || null);
            setImprovementContext({
                findings: improvementResponse.data.data?.findings || [],
                improvements: improvementResponse.data.data?.improvements || [],
            });
            setImprovementForm((current) => ({
                ...current,
                justification: '',
                finding_ptk_id: '',
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Catatan peningkatan gagal disimpan.');
        } finally {
            setImprovementSubmitting(false);
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
                            <SummaryCard label="Versi" value={`v${standard.version_number || 1}`} hint={standard.root_standard_id ? 'Tersambung ke histori versi standar' : 'Versi awal standar'} />
                            <SummaryCard label="Kategori" value={normalizeStandardCategory(standard.category)} />
                            <SummaryCard label="Periode Tahun" value={String(standard.periode_tahun || '-')} />
                            <SummaryCard label="Versi Sebelumnya" value={standard.previous_standard ? `${standard.previous_standard.name} (v${standard.previous_standard.version_number || 1})` : '-'} />
                            <SummaryCard label="Versi Pengganti" value={standard.superseded_by_standard ? `${standard.superseded_by_standard.name} (v${standard.superseded_by_standard.version_number || 1})` : '-'} />
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
                            {standard.improvement_justification ? (
                                <div className="rounded-3xl border border-emerald-900 bg-emerald-950/60 p-5 text-sm text-emerald-100 shadow-sm lg:col-span-2">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Justifikasi Peningkatan</div>
                                    <div className="mt-2 leading-6">{standard.improvement_justification}</div>
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
                            {(standard.previous_standard || (standard.newer_versions || []).length > 0 || (standard.improvements || []).length > 0) && (
                                <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                    <div className="text-sm font-semibold text-slate-100">Riwayat Versi dan Peningkatan</div>
                                    <div className="mt-3 space-y-3 text-sm text-slate-300">
                                        {standard.previous_standard ? (
                                            <div>Versi sebelumnya: {standard.previous_standard.name} (v{standard.previous_standard.version_number || 1})</div>
                                        ) : null}
                                        {(standard.newer_versions || []).map((item) => (
                                            <div key={item.id}>Versi lanjutan: {item.name} (v{item.version_number || 1}) • periode {item.periode_tahun || '-'}</div>
                                        ))}
                                        {(standard.improvements || []).map((item) => (
                                            <div key={item.id}>
                                                Keputusan {item.action} • {item.justification}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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

                    {activeTab === 'improvement' && (
                        <section className="space-y-6">
                            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                <div className="text-sm font-semibold text-slate-100">Catatan Peningkatan Siklus Berikutnya</div>
                                <div className="mt-2 text-sm leading-6 text-slate-400">
                                    Gunakan tab ini untuk mencatat apa yang perlu diperbaiki pada standar, serta memutuskan apakah standar akan diterapkan kembali pada siklus berikutnya atau tidak.
                                </div>
                            </div>

                            {isImprovementLocked && (
                                <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 text-sm text-white shadow-2xl backdrop-blur-xl">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-amber-950/55 to-slate-950/80" />
                                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />
                                    <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-sky-300/10 blur-3xl" />
                                    <div className="relative flex items-start gap-4">
                                        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-amber-200">
                                            <Icon icon={Icons.locked} width={20} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
                                                Feature Locked
                                            </div>
                                            <div className="mt-2 text-base font-semibold text-white">
                                                Standar ini masih belum di implementasi
                                            </div>
                                            <div className="mt-2 max-w-2xl leading-6 text-slate-200">
                                                Fitur baru dibuka setelah standar ini diimplementasi.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isImprovementLocked && (
                            <form onSubmit={handleImprovementSubmit} className="space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-200">Keputusan Siklus Berikutnya</label>
                                    <select
                                        value={improvementForm.action}
                                        onChange={(event) => setImprovementForm((current) => ({ ...current, action: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950"
                                    >
                                        {Object.entries(improvementActionLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {improvementForm.action === 'REVISI' && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-200">Periode Re-Implementasi</label>
                                        <input
                                            type="number"
                                            value={improvementForm.target_period_year}
                                            onChange={(event) => setImprovementForm((current) => ({ ...current, target_period_year: event.target.value }))}
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-200">Temuan Audit Terkait</label>
                                    <select
                                        value={improvementForm.finding_ptk_id}
                                        onChange={(event) => setImprovementForm((current) => ({ ...current, finding_ptk_id: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950"
                                    >
                                        <option value="">Tanpa temuan spesifik</option>
                                        {(improvementContext.findings || []).map((finding) => (
                                            <option key={finding.id} value={finding.id}>
                                                {finding.metric?.content || 'Temuan audit'} 
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-200">Catatan yang Perlu Diperbaiki</label>
                                    <textarea
                                        rows={5}
                                        value={improvementForm.justification}
                                        onChange={(event) => setImprovementForm((current) => ({ ...current, justification: event.target.value }))}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-950"
                                        placeholder="Tuliskan apa yang perlu diperbaiki, dipertahankan, atau alasan standar tidak diterapkan lagi di siklus berikutnya."
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={improvementSubmitting}
                                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                    >
                                        <Icon icon={Icons.save} width={16} />
                                        {improvementSubmitting ? 'Menyimpan...' : 'Simpan Catatan Peningkatan'}
                                    </button>
                                </div>
                            </form>
                            )}

                            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="text-sm font-semibold text-slate-100">Riwayat Peningkatan Standar Ini</div>
                                    <span className="text-xs text-slate-400">{improvementContext.improvements?.length || 0} catatan</span>
                                </div>

                                {improvementLoading ? (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 py-8 text-sm text-slate-400">
                                        Memuat riwayat peningkatan...
                                    </div>
                                ) : (improvementContext.improvements?.length || 0) === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 py-8 text-sm text-slate-400">
                                        Belum ada catatan peningkatan untuk standar ini.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {improvementContext.improvements.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-100">
                                                            {improvementActionLabels[item.action] || item.action}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-400">
                                                            {item.cycle_year ? `Siklus ${item.cycle_year}` : '-'} • {formatDateTime(item.decided_at)}
                                                        </div>
                                                    </div>
                                                    {item.new_standard ? (
                                                        <Link to={`/standards/${item.new_standard.id}/detail`} className="text-xs font-semibold text-emerald-300 underline">
                                                            Buka versi revisi
                                                        </Link>
                                                    ) : null}
                                                </div>
                                                <div className="mt-3 text-sm leading-6 text-slate-300">{item.justification}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
