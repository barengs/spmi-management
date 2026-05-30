import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useSelector } from 'react-redux';

function formatDate(value, options = { dateStyle: 'long' }) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', options);
}

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

function formatAcademicYear(value) {
    if (!value) {
        return '-';
    }

    return `${value} / ${Number(value) + 1}`;
}

function getPtkStatusBadge(status) {
    if (status === 'CLOSED') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (status === 'VERIFIED') {
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }
    if (status === 'RESPONDED') {
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
    if (status === 'REVISION_REQUIRED') {
        return 'border-orange-200 bg-orange-50 text-orange-700';
    }

    return 'border-rose-200 bg-rose-50 text-rose-700';
}

function getPtkStatusLabel(status) {
    const labels = {
        OPEN: 'Perlu Tindak Lanjut',
        RESPONDED: 'Menunggu Verifikasi',
        REVISION_REQUIRED: 'Perlu Revisi',
        VERIFIED: 'Terverifikasi',
        CLOSED: 'Selesai',
    };

    return labels[status] || status || '-';
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

function buildAuditObjectives(report) {
    const standardName = report.standard?.name || 'standar mutu';
    const prodiName = report.prodi?.name || 'program studi';

    return [
        `Memastikan implementasi ${standardName.toLowerCase()} pada ${prodiName} berjalan sesuai ketentuan yang ditetapkan.`,
        `Mengidentifikasi temuan audit, ketidaksesuaian, dan area peningkatan mutu pada ${prodiName}.`,
        'Menyediakan dasar tindak lanjut perbaikan bagi auditee dan unit terkait.',
    ];
}

function buildAuditScope(report) {
    const scope = [];

    if (report.standard?.name) {
        scope.push(`Standar yang diaudit: ${report.standard.name}`);
    }

    if (report.prodi?.name) {
        scope.push(`Unit auditee: ${report.prodi.name}`);
    }

    if (report.location) {
        scope.push(`Lokasi audit: ${report.location}`);
    }

    if (report.notes) {
        scope.push(`Catatan ruang lingkup: ${report.notes}`);
    }

    return scope.length > 0 ? scope : ['Ruang lingkup audit mengikuti jadwal audit dan indikator mutu yang diperiksa auditor.'];
}

function buildAuditConclusion(report) {
    if (report.audit_period_conclusion) {
        return [report.audit_period_conclusion];
    }

    const findingsTotal = report.findings_summary?.total || 0;
    const openFindings = report.findings_summary?.open || 0;
    const closedFindings = report.findings_summary?.closed || 0;
    const respondedFindings = report.findings_summary?.responded || 0;
    const verifiedFindings = report.findings_summary?.verified || 0;

    const result = [
        `Audit terhadap ${report.prodi?.name || 'program studi'} dilaksanakan pada ${formatDateTime(report.scheduled_start)} dengan status laporan ${getAuditScheduleStatusLabel(report.overall_status).toLowerCase()}.`,
        `Total temuan audit yang tercatat sebanyak ${findingsTotal}, terdiri dari ${openFindings} temuan terbuka, ${respondedFindings} menunggu verifikasi, ${verifiedFindings} terverifikasi, dan ${closedFindings} selesai.`,
    ];

    if (report.auditor_response_note) {
        result.push(`Catatan auditor: ${report.auditor_response_note}`);
    }

    if (report.auditee_response_note) {
        result.push(`Catatan auditee: ${report.auditee_response_note}`);
    }

    if (!report.auditor_response_note && !report.auditee_response_note && report.notes) {
        result.push(`Catatan tambahan audit: ${report.notes}`);
    }

    return result;
}

function buildAttachments(report) {
    const attachments = ['Daftar temuan audit (PTK).'];

    if ((report.findings_summary?.total || 0) > 0) {
        attachments.push('Dokumen tindak lanjut atas temuan yang sudah direspons auditee.');
    }

    if (report.notes) {
        attachments.push('Catatan pelaksanaan audit dari jadwal audit.');
    }

    if (report.audit_period_conclusion) {
        attachments.push('Kesimpulan akhir audit yang disahkan pada saat periode audit ditutup.');
    }

    return attachments;
}

function SectionHeading({ children }) {
    return <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</h3>;
}

function MetadataRow({ label, value }) {
    return (
        <div className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <div className="text-sm font-medium text-slate-600">{label}</div>
            <div className="text-sm text-slate-900">{value || '-'}</div>
        </div>
    );
}

export default function ReportDetailPage() {
    const { id } = useParams();
    const user = useSelector((state) => state.auth.user);
    const [auditReports, setAuditReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [selectedExportFormat, setSelectedExportFormat] = useState('docx');

    useEffect(() => {
        const fetchAuditReports = async () => {
            try {
                setLoading(true);
                const response = await api.get('/audit-reports');
                setAuditReports(response.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Detail laporan audit gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuditReports();
    }, []);

    const report = useMemo(
        () => auditReports.find((item) => String(item.id) === String(id)) || null,
        [auditReports, id],
    );

    const canExportReport = useMemo(() => {
        const roles = user?.roles || [];
        const permissions = user?.permissions || [];
        const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));

        return hasRole('SuperAdmin') || permissions.includes('report.view') || permissions.includes('report.export');
    }, [user]);

    const handleExport = async () => {
        if (!report) {
            return;
        }

        try {
            setIsExporting(true);
            const response = await api.get(`/audit-reports/${report.id}/export`, {
                params: { format: selectedExportFormat },
                responseType: 'blob',
            });

            const fallbackFileName = `laporan-ami-${report.id}.${selectedExportFormat}`;
            const contentType = response.headers['content-type']
                || (selectedExportFormat === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            const contentDisposition = response.headers['content-disposition'] || '';
            const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
            const fileName = fileNameMatch?.[1] || fallbackFileName;
            const blob = new Blob([response.data], { type: contentType });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setIsExportDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Export laporan audit gagal diproses.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 sm:p-8">
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                    Memuat detail laporan audit...
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="space-y-4 p-6 sm:p-8">
                <Link to="/report" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    Kembali ke daftar laporan
                </Link>
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                    Laporan audit tidak ditemukan.
                </div>
            </div>
        );
    }

    const objectives = buildAuditObjectives(report);
    const scopes = buildAuditScope(report);
    const conclusions = buildAuditConclusion(report);
    const attachments = buildAttachments(report);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/report" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    Kembali ke daftar laporan
                </Link>
                {canExportReport && (
                    <button
                        type="button"
                        onClick={() => setIsExportDialogOpen(true)}
                        disabled={isExporting}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isExporting ? 'Mengekspor...' : 'Export Laporan AMI'}
                    </button>
                )}
            </div>

            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-white px-6 py-8 sm:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Laporan Audit Mutu Internal
                            </div>
                            <h1 className="mt-2 text-3xl font-semibold text-slate-900">FAKULTAS</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Fakultas {report.faculty?.name || '-'} | Program Studi {report.prodi?.name || '-'} | Tahun Akademik {formatAcademicYear(report.standard?.periode_tahun)}
                            </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getAuditScheduleStatusBadge(report.overall_status)}`}>
                            {getAuditScheduleStatusLabel(report.overall_status)}
                        </span>
                    </div>
                </div>

                <div className="space-y-8 px-6 py-6 sm:px-8">
                    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <MetadataRow label="Jenjang" value={report.prodi?.level ? String(report.prodi.level).toUpperCase() : '-'} />
                            <MetadataRow label="Standar" value={report.standard?.name || '-'} />
                            <MetadataRow label="Fakultas" value={report.faculty?.name || '-'} />
                            <MetadataRow label="Program Studi" value={report.prodi?.name || '-'} />
                            <MetadataRow label="Ketua Auditor" value={report.lead_auditor?.name || '-'} />
                            <MetadataRow label="Anggota Auditor" value={report.auditor?.name || '-'} />
                            <MetadataRow label="Auditee" value={report.auditee?.name || '-'} />
                            <MetadataRow label="Tahun Akademik" value={formatAcademicYear(report.standard?.periode_tahun)} />
                            <MetadataRow label="Periode Ditutup" value={formatDateTime(report.audit_period_closed_at)} />
                            <MetadataRow label="Penutup Periode" value={report.period_closer?.name || '-'} />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>I. Pendahuluan</SectionHeading>
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <p className="text-sm leading-7 text-slate-700">
                                Audit Mutu Internal ini dilaksanakan untuk menilai pelaksanaan standar mutu pada {report.prodi?.name || 'program studi'}
                                {report.faculty?.name ? ` di ${report.faculty.name}` : ''}. Pemeriksaan dilakukan oleh tim auditor berdasarkan jadwal audit,
                                indikator mutu, bukti pendukung, dan tindak koreksi yang tercatat di sistem.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>II. Tujuan Audit</SectionHeading>
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <ol className="space-y-2 text-sm leading-7 text-slate-700">
                                {objectives.map((objective, index) => (
                                    <li key={`objective-${index}`} className="flex gap-3">
                                        <span className="font-semibold text-slate-500">{String.fromCharCode(97 + index)}.</span>
                                        <span>{objective}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>III. Lingkup Audit</SectionHeading>
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <ul className="space-y-2 text-sm leading-7 text-slate-700">
                                {scopes.map((scope, index) => (
                                    <li key={`scope-${index}`} className="flex gap-3">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span>{scope}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>IV. Jadwal Audit</SectionHeading>
                        <div className="overflow-hidden rounded-3xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Tanggal Mulai</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tanggal Selesai</th>
                                        <th className="px-4 py-3 text-left font-semibold">Lokasi</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                                    <tr>
                                        <td className="px-4 py-3">{formatDateTime(report.scheduled_start)}</td>
                                        <td className="px-4 py-3">{formatDateTime(report.scheduled_end)}</td>
                                        <td className="px-4 py-3">{report.location || '-'}</td>
                                        <td className="px-4 py-3">{getAuditScheduleStatusLabel(report.overall_status)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>V. Temuan Audit</SectionHeading>
                        <div className="overflow-hidden rounded-3xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">No</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold">Referensi</th>
                                        <th className="px-4 py-3 text-left font-semibold">Pernyataan Temuan</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tindak Lanjut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                                    {report.findings?.length ? report.findings.map((finding, index) => (
                                        <tr key={finding.id} className="align-top">
                                            <td className="px-4 py-3">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${getPtkStatusBadge(finding.status)}`}>
                                                    {getPtkStatusLabel(finding.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{finding.standard?.name || '-'}</div>
                                                <div className="mt-1 text-xs text-slate-500">{finding.metric?.content || '-'}</div>
                                            </td>
                                            <td className="px-4 py-3">{finding.finding_summary || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div>{finding.status === 'OPEN' ? 'Belum ada tindak lanjut.' : getPtkStatusLabel(finding.status)}</div>
                                                {finding.created_at && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        Dicatat: {formatDateTime(finding.created_at)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                                Tidak ada temuan audit untuk jadwal ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>VI. Kesimpulan Audit</SectionHeading>
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <ul className="space-y-2 text-sm leading-7 text-slate-700">
                                {conclusions.map((conclusion, index) => (
                                    <li key={`conclusion-${index}`} className="flex gap-3">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                                        <span>{conclusion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading>VII. Lampiran Audit</SectionHeading>
                        <div className="rounded-3xl border border-slate-200 p-5">
                            <ol className="space-y-2 text-sm leading-7 text-slate-700">
                                {attachments.map((attachment, index) => (
                                    <li key={`attachment-${index}`} className="flex gap-3">
                                        <span className="font-semibold text-slate-500">{index + 1}.</span>
                                        <span>{attachment}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>
                </div>
            </article>

            {isExportDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Export Laporan AMI</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Pilih format file yang ingin digunakan untuk mengunduh laporan audit.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isExporting && setIsExportDialogOpen(false)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            {[
                                { value: 'docx', label: '.docx', description: 'Format Word modern yang direkomendasikan.' },
                                { value: 'pdf', label: '.pdf', description: 'Format final siap baca dan cetak.' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                        selectedExportFormat === option.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="export-format"
                                        value={option.value}
                                        checked={selectedExportFormat === option.value}
                                        onChange={(event) => setSelectedExportFormat(event.target.value)}
                                        className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                                        <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setIsExportDialogOpen(false)}
                                disabled={isExporting}
                                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={isExporting}
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isExporting ? 'Mengekspor...' : `Export ${selectedExportFormat.toUpperCase()}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
