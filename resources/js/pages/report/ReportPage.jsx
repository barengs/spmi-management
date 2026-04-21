import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

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

function getStatusBadge(status) {
    if (status === 'TERBIT') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'WAITING_APPROVAL') {
        return 'bg-amber-100 text-amber-700';
    }

    if (status === 'REVISI') {
        return 'bg-rose-100 text-rose-700';
    }

    return 'bg-slate-100 text-slate-700';
}

function getAuditResult(item) {
    if (item.status === 'TERBIT') {
        return 'Disetujui dan diterbitkan';
    }

    if (item.status === 'WAITING_APPROVAL' && item.review_submitted_at) {
        return 'Review auditor selesai, menunggu keputusan akhir';
    }

    if (item.status === 'WAITING_APPROVAL') {
        return 'Sedang direview auditor';
    }

    if (item.status === 'REVISI') {
        return 'Perlu revisi';
    }

    return 'Masih disusun';
}

export default function ReportPage() {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));
    const canExport = hasRole('SuperAdmin') || permissions.includes('report.export');

    useEffect(() => {
        const fetchStandards = async () => {
            try {
                const response = await api.get('/standards');
                setStandards(response.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Riwayat laporan audit gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchStandards();
    }, []);

    const periods = useMemo(() => (
        Array.from(
            new Set(
                standards
                    .map((item) => item.periode_tahun)
                    .filter(Boolean)
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value))
            )
        ).sort((left, right) => right - left)
    ), [standards]);

    useEffect(() => {
        if (!periods.length) {
            return;
        }

        if (!selectedPeriod || !periods.includes(Number(selectedPeriod))) {
            setSelectedPeriod(String(periods[0]));
        }
    }, [periods, selectedPeriod]);

    const filteredStandards = useMemo(() => (
        standards
            .filter((item) => !selectedPeriod || Number(item.periode_tahun) === Number(selectedPeriod))
            .filter((item) => !selectedStatus || item.status === selectedStatus)
            .sort((left, right) => {
                const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
                const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
                return rightTime - leftTime;
            })
    ), [selectedPeriod, selectedStatus, standards]);

    const summary = useMemo(() => ({
        total: filteredStandards.length,
        published: filteredStandards.filter((item) => item.status === 'TERBIT').length,
        waiting: filteredStandards.filter((item) => item.status === 'WAITING_APPROVAL').length,
        revised: filteredStandards.filter((item) => item.status === 'REVISI').length,
    }), [filteredStandards]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Icon icon={Icons.report} width={14} />
                    Laporan Audit
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Riwayat Hasil Audit</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Menampilkan riwayat semua hasil sesi audit berdasarkan lifecycle standar, sehingga progres keputusan, revisi, dan penerbitan dapat ditelusuri per periode.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Total Sesi</div>
                    <div className="mt-3 text-2xl font-semibold text-gray-900">{summary.total}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Terbit</div>
                    <div className="mt-3 text-2xl font-semibold text-emerald-700">{summary.published}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Menunggu Approval</div>
                    <div className="mt-3 text-2xl font-semibold text-amber-700">{summary.waiting}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Perlu Revisi</div>
                    <div className="mt-3 text-2xl font-semibold text-rose-700">{summary.revised}</div>
                    <p className="mt-2 text-sm text-gray-500">Ekspor laporan: {canExport ? 'Aktif' : 'Tidak Aktif'}</p>
                </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Periode</span>
                        <select
                            value={selectedPeriod}
                            onChange={(event) => setSelectedPeriod(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                            {periods.map((period) => (
                                <option key={period} value={period}>
                                    SPMI {period}
                                </option>
                            ))}
                            {periods.length === 0 && <option value="">Belum ada periode</option>}
                        </select>
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Status Audit</span>
                        <select
                            value={selectedStatus}
                            onChange={(event) => setSelectedStatus(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                            <option value="">Semua status</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="WAITING_APPROVAL">WAITING_APPROVAL</option>
                            <option value="REVISI">REVISI</option>
                            <option value="TERBIT">TERBIT</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="space-y-4">
                {loading && (
                    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                        Memuat riwayat audit...
                    </div>
                )}

                {!loading && filteredStandards.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                        Belum ada riwayat audit yang sesuai dengan filter.
                    </div>
                )}

                {!loading && filteredStandards.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-semibold text-gray-900">{item.name}</h2>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(item.status)}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                    Kategori {item.category} pada periode {item.periode_tahun || '-'}.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hasil Audit</div>
                                <div className="mt-1 font-semibold text-slate-900">{getAuditResult(item)}</div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-4">
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Mulai Disusun</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(item.created_at)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Diajukan</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(item.updated_at)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Review Auditor</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(item.review_submitted_at)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Keputusan Akhir</div>
                                <div className="mt-2 text-sm font-medium text-gray-900">
                                    {item.status === 'TERBIT' || item.status === 'REVISI' ? formatDateTime(item.updated_at) : '-'}
                                </div>
                            </div>
                        </div>

                        {item.referensi_regulasi && (
                            <div className="mt-5 rounded-2xl border border-gray-200 px-4 py-4 text-sm leading-6 text-gray-600">
                                {item.referensi_regulasi}
                            </div>
                        )}
                    </article>
                ))}
            </section>
        </div>
    );
}
