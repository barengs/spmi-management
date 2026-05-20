import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

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
    const [auditReports, setAuditReports] = useState([]);
    const [loading, setLoading] = useState(true);

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
            <Link to="/report" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Kembali ke daftar laporan
            </Link>

            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white sm:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                                Laporan Audit Mutu Internal
                            </div>
                            <h1 className="mt-2 text-2xl font-semibold">{report.title}</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-200">
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
        </div>
    );
}
