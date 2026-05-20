import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

function formatDate(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', {
        dateStyle: 'medium',
    });
}

function getAuditScheduleStatusBadge(status) {
    if (status === 'APPROVED') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (status === 'REJECTED') {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    return 'border-amber-200 bg-amber-50 text-amber-700';
}

function getAuditScheduleStatusLabel(status) {
    if (status === 'APPROVED') {
        return 'Disetujui';
    }
    if (status === 'REJECTED') {
        return 'Ditolak';
    }

    return 'Menunggu Persetujuan';
}

export default function ReportPage() {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const [auditReports, setAuditReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProdi, setSelectedProdi] = useState('');

    const canExport = permissions.includes('report.export');

    useEffect(() => {
        const fetchAuditReports = async () => {
            try {
                setLoading(true);
                const response = await api.get('/audit-reports');
                setAuditReports(response.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Laporan audit gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuditReports();
    }, []);

    const prodiOptions = useMemo(() => (
        Array.from(
            new Map(
                auditReports
                    .filter((item) => item.prodi)
                    .map((item) => [String(item.prodi.id), item.prodi])
            ).values()
        ).sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [auditReports]);

    useEffect(() => {
        if (!prodiOptions.length) {
            return;
        }

        if (!selectedProdi || !prodiOptions.some((prodi) => String(prodi.id) === selectedProdi)) {
            setSelectedProdi(String(prodiOptions[0].id));
        }
    }, [prodiOptions, selectedProdi]);

    const filteredReports = useMemo(() => (
        auditReports.filter((item) => !selectedProdi || String(item.prodi?.id) === selectedProdi)
    ), [auditReports, selectedProdi]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Icon icon={Icons.report} width={14} />
                    Laporan AMI
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-slate-900">Laporan Audit Mutu Internal</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Menampilkan daftar laporan audit secara ringkas. Detail lengkap laporan auditor tersedia di halaman detail.
                </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className="grid gap-2 md:max-w-sm">
                    <span className="text-sm font-medium text-slate-700">Filter Program Studi</span>
                    <select
                        value={selectedProdi}
                        onChange={(event) => setSelectedProdi(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                        <option value="">Semua Prodi</option>
                        {prodiOptions.map((prodi) => (
                            <option key={prodi.id} value={String(prodi.id)}>
                                {prodi.name} ({prodi.code})
                            </option>
                        ))}
                    </select>
                </label>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                {loading && (
                    <div className="px-6 py-10 text-center text-sm text-slate-500">
                        Memuat laporan audit...
                    </div>
                )}

                {!loading && filteredReports.length === 0 && (
                    <div className="px-6 py-10 text-center text-sm text-slate-500">
                        Belum ada laporan audit yang sesuai dengan filter.
                    </div>
                )}

                {!loading && filteredReports.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Prodi</th>
                                    <th className="px-4 py-3 text-left font-semibold">Fakultas</th>
                                    <th className="px-4 py-3 text-left font-semibold">Tanggal Audit</th>
                                    <th className="px-4 py-3 text-left font-semibold">Auditor</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                                {filteredReports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{report.prodi?.name || '-'}</td>
                                        <td className="px-4 py-3">{report.faculty?.name || '-'}</td>
                                        <td className="px-4 py-3">{formatDate(report.scheduled_start)}</td>
                                        <td className="px-4 py-3">
                                            <div>{report.lead_auditor?.name || '-'}</div>
                                            {report.auditor?.name && report.auditor?.name !== report.lead_auditor?.name && (
                                                <div className="text-xs text-slate-500">{report.auditor.name}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getAuditScheduleStatusBadge(report.overall_status)}`}>
                                                {getAuditScheduleStatusLabel(report.overall_status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/report/${report.id}`}
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                                            >
                                                <Icon icon={Icons.report} width={14} />
                                                Lihat Detail
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                Ekspor laporan: {canExport ? 'Aktif' : 'Tidak Aktif'}
            </section>
        </div>
    );
}
