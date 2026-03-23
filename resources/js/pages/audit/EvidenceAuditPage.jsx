import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

const statusStyles = {
    ALL: 'bg-gray-100 text-gray-700 border-gray-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const statusLabels = {
    ALL: 'Semua',
    PENDING: 'Dipending',
    REJECTED: 'Ditolak',
    ACCEPTED: 'Diterima',
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

export default function EvidenceAuditPage() {
    const [evidences, setEvidences] = useState([]);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const fetchEvidences = async () => {
        try {
            setLoading(true);
            const response = await api.get('/evidences/audit');
            setEvidences(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Daftar audit bukti gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvidences();
    }, []);

    const filteredEvidences = useMemo(() => {
        if (statusFilter === 'ALL') {
            return evidences;
        }

        return evidences.filter((evidence) => evidence.review_status === statusFilter);
    }, [evidences, statusFilter]);

    const counts = useMemo(() => ({
        ALL: evidences.length,
        PENDING: evidences.filter((item) => item.review_status === 'PENDING').length,
        REJECTED: evidences.filter((item) => item.review_status === 'REJECTED').length,
        ACCEPTED: evidences.filter((item) => item.review_status === 'ACCEPTED').length,
    }), [evidences]);

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                    <Icon icon={Icons.audit} width={14} />
                    Audit Review
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Daftar Review Bukti</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Seluruh bukti audit ditampilkan dalam satu tabel agar auditor bisa memfilter status dan masuk ke halaman review detail saat diperlukan.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap gap-3">
                    {['ALL', 'PENDING', 'REJECTED', 'ACCEPTED'].map((status) => {
                        const isActive = statusFilter === status;

                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                    isActive
                                        ? statusStyles[status]
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <span>{statusLabels[status]}</span>
                                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-gray-700">
                                    {counts[status]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Tabel Bukti Audit
                        </h2>
                        <span className="text-sm text-gray-500">
                            {filteredEvidences.length} data
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Dokumen</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standar</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Indicator</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Uploader</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Jenis</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Review Terakhir</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat data audit...
                                    </td>
                                </tr>
                            ) : filteredEvidences.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Tidak ada bukti audit untuk filter status ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredEvidences.map((evidence) => (
                                    <tr key={evidence.id} className="align-top hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {evidence.title || evidence.original_name || evidence.link_url}
                                            </div>
                                            <div className="mt-1 text-xs leading-5 text-gray-500">
                                                {evidence.notes || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {evidence.metric?.standard?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {evidence.metric?.content || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {evidence.uploader?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {evidence.source_type === 'file'
                                                ? `${evidence.original_name || 'File'} • ${formatBytes(evidence.size_bytes)}`
                                                : 'Link Dokumen'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[evidence.review_status] || statusStyles.PENDING}`}>
                                                {statusLabels[evidence.review_status] || evidence.review_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {formatDate(evidence.reviewed_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/audit/standards/${evidence.metric?.standard?.id}/review`}
                                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                                            >
                                                <Icon icon={Icons.audit} width={16} />
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
