import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import TablePagination from '../../components/ui/TablePagination';

const initialForm = {
    title: '',
    standard_id: '',
    faculty_id: '',
    prodi_id: '',
    lead_auditor_id: '',
    auditor_id: '',
    scheduled_start: '',
    scheduled_end: '',
};

const statusStyles = {
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    waiting_auditor: 'bg-amber-100 text-amber-800 border-amber-200',
    waiting_auditee: 'bg-orange-100 text-orange-800 border-orange-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function ApprovalBadge({ label, status }) {
    const tone = status === 'APPROVED'
        ? 'approved'
        : status === 'REJECTED'
            ? 'rejected'
            : 'pending';
    const text = status === 'APPROVED'
        ? 'Disetujui'
        : status === 'REJECTED'
            ? 'Ditolak'
            : 'Pending';

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[tone]}`}>
            {label}: {text}
        </span>
    );
}

function getScheduleStatusPresentation(schedule) {
    if (schedule.overall_status === 'APPROVED') {
        return {
            tone: 'approved',
            label: 'Disetujui',
        };
    }

    if (schedule.overall_status === 'REJECTED') {
        return {
            tone: 'rejected',
            label: 'Ditolak',
        };
    }

    if (schedule.auditor_status !== 'APPROVED') {
        return {
            tone: 'waiting_auditor',
            label: 'Menunggu Auditor',
        };
    }

    if (schedule.auditee_status !== 'APPROVED') {
        return {
            tone: 'waiting_auditee',
            label: 'Menunggu Auditee',
        };
    }

    return {
        tone: 'pending',
        label: 'Menunggu Persetujuan',
    };
}

function toDateTimeLocalInput(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60000));
    return localDate.toISOString().slice(0, 16);
}

export default function AuditSchedulePage() {
    const PAGE_SIZE = 10;
    const user = useSelector((state) => state.auth.user);
    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name));
    const isLpmAdmin = roleNames.includes('LPM-Admin') || roleNames.includes('SuperAdmin');
    const [schedules, setSchedules] = useState([]);
    const [metadata, setMetadata] = useState({
        faculties: [],
        prodis: [],
        lead_auditors: [],
        auditors: [],
        standards: [],
    });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [respondingId, setRespondingId] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await api.get('/audit-schedules');
            setSchedules(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Jadwal audit gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        if (!isLpmAdmin) {
            return;
        }

        try {
            const response = await api.get('/audit-schedules/metadata');
            setMetadata(response.data.data || {
                faculties: [],
                prodis: [],
                lead_auditors: [],
                auditors: [],
                standards: [],
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data pendukung jadwal audit gagal dimuat.');
        }
    };

    useEffect(() => {
        fetchSchedules();
        fetchMetadata();
    }, []);

    const prodiOptions = useMemo(() => (
        metadata.prodis.filter((prodi) => !form.faculty_id || String(prodi.parent_id) === String(form.faculty_id))
    ), [form.faculty_id, metadata.prodis]);

    const openModal = () => {
        setForm(initialForm);
        setEditingSchedule(null);
        setModalOpen(true);
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setForm({
            title: schedule.title || '',
            standard_id: schedule.standard?.id ? String(schedule.standard.id) : '',
            faculty_id: schedule.faculty?.id ? String(schedule.faculty.id) : '',
            prodi_id: schedule.prodi?.id ? String(schedule.prodi.id) : '',
            lead_auditor_id: schedule.lead_auditor?.id ? String(schedule.lead_auditor.id) : '',
            auditor_id: schedule.auditor?.id ? String(schedule.auditor.id) : '',
            scheduled_start: toDateTimeLocalInput(schedule.scheduled_start),
            scheduled_end: toDateTimeLocalInput(schedule.scheduled_end),
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        if (submitting) {
            return;
        }

        setModalOpen(false);
        setForm(initialForm);
        setEditingSchedule(null);
    };

    const submitSchedule = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...form,
                standard_id: form.standard_id || null,
                faculty_id: form.faculty_id || null,
                prodi_id: form.prodi_id || null,
            };
            const response = editingSchedule
                ? await api.put(`/audit-schedules/${editingSchedule.id}`, payload)
                : await api.post('/audit-schedules', payload);

            toast.success(response.data.message || (editingSchedule ? 'Jadwal audit berhasil diperbarui.' : 'Jadwal audit berhasil dibuat.'));
            closeModal();
            await fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || (editingSchedule ? 'Jadwal audit gagal diperbarui.' : 'Jadwal audit gagal dibuat.'));
        } finally {
            setSubmitting(false);
        }
    };

    const deleteSchedule = async (schedule) => {
        if (!window.confirm(`Hapus jadwal audit "${schedule.title}"?`)) {
            return;
        }

        try {
            const response = await api.delete(`/audit-schedules/${schedule.id}`);
            toast.success(response.data.message || 'Jadwal audit berhasil dihapus.');
            await fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Jadwal audit gagal dihapus.');
        }
    };

    const respondToSchedule = async (scheduleId, action) => {
        const note = window.prompt(
            action === 'approve'
                ? 'Catatan persetujuan (opsional):'
                : 'Catatan penolakan:'
        );

        if (action === 'reject' && note !== null && !note.trim()) {
            toast.warning('Catatan penolakan sebaiknya diisi.');
        }

        if (note === null) {
            return;
        }

        setRespondingId(scheduleId);

        try {
            const response = await api.patch(`/audit-schedules/${scheduleId}/respond`, {
                action,
                note,
            });

            toast.success(response.data.message);
            await fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Respons jadwal audit gagal disimpan.');
        } finally {
            setRespondingId(null);
        }
    };

    const canRespond = (schedule) => {
        const userId = user?.id;

        if (!userId) {
            return false;
        }

        const isAssignedAuditor = String(schedule.auditor?.id) === String(userId);
        const isAssignedLeadAuditor = String(schedule.lead_auditor?.id) === String(userId);
        const isAssignedAuditee = String(schedule.auditee?.id) === String(userId);

        if (!isAssignedLeadAuditor && !isAssignedAuditor && !isAssignedAuditee) {
            return false;
        }

        if (schedule.overall_status === 'APPROVED') {
            return false;
        }

        if ((isAssignedLeadAuditor || isAssignedAuditor) && schedule.auditor_status === 'PENDING') {
            return true;
        }

        if (isAssignedAuditee && schedule.auditee_status === 'PENDING') {
            return true;
        }

        return false;
    };

    const filteredSchedules = useMemo(() => (
        schedules.filter((schedule) => {
            const haystack = [
                schedule.title,
                schedule.standard?.name,
                schedule.faculty?.name,
                schedule.prodi?.name,
                schedule.lead_auditor?.name,
                schedule.auditor?.name,
                schedule.auditee?.name,
                schedule.location,
            ].filter(Boolean).join(' ').toLowerCase();

            const matchesSearch = haystack.includes(search.trim().toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || schedule.overall_status === statusFilter;

            return matchesSearch && matchesStatus;
        })
    ), [schedules, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE));
    const paginatedSchedules = useMemo(() => (
        filteredSchedules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    ), [filteredSchedules, page]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                            <Icon icon={Icons.schedule} width={14} />
                            Audit Schedule
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Jadwal Audit</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            LPM-Admin membuat jadwal audit. Setelah dibuat, auditor dan auditee yang ditugaskan wajib memberikan approval agar jadwal menjadi aktif.
                        </p>
                    </div>

                    {isLpmAdmin && (
                        <button
                            type="button"
                            onClick={openModal}
                            className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                        >
                            <Icon icon={Icons.add} width={16} />
                            Buat Jadwal
                        </button>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Jadwal Audit</h2>
                    <span className="text-sm text-gray-500">{filteredSchedules.length} jadwal</span>
                </div>
                <div className="grid gap-4 border-b border-gray-200 px-6 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Filter judul, standar, fakultas, prodi, lead auditor, auditor..."
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="PENDING_APPROVAL">Menunggu Persetujuan</option>
                        <option value="APPROVED">Disetujui</option>
                        <option value="REJECTED">Ditolak</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prodi - Fakultas</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Lead Auditor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Auditor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Auditee</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Approval Auditor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Approval Auditee</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat jadwal audit...
                                    </td>
                                </tr>
                            ) : filteredSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Belum ada jadwal audit.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSchedules.map((schedule) => (
                                    <tr key={schedule.id} className="align-top hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{formatDateTime(schedule.scheduled_start)}</div>
                                            <div className="mt-1 text-sm text-gray-500">
                                                s/d {formatDateTime(schedule.scheduled_end)}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {schedule.title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {schedule.prodi?.name || '-'} - {schedule.faculty?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{schedule.lead_auditor?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{schedule.auditor?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{schedule.auditee?.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const presentation = getScheduleStatusPresentation(schedule);
                                                return (
                                                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[presentation.tone] || statusStyles.pending}`}>
                                                        {presentation.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <ApprovalBadge label="Auditor" status={schedule.auditor_status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <ApprovalBadge label="Auditee" status={schedule.auditee_status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isLpmAdmin && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(schedule)}
                                                            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                                                        >
                                                            <Icon icon={Icons.edit} width={14} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteSchedule(schedule)}
                                                            className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                                                        >
                                                            <Icon icon={Icons.delete} width={14} />
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                                {canRespond(schedule) ? (
                                                    <>
                                                    <button
                                                        type="button"
                                                        onClick={() => respondToSchedule(schedule.id, 'approve')}
                                                        disabled={respondingId === schedule.id}
                                                        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Icon icon={Icons.check} width={14} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => respondToSchedule(schedule.id, 'reject')}
                                                        disabled={respondingId === schedule.id}
                                                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Icon icon={Icons.close} width={14} />
                                                        Reject
                                                    </button>
                                                    </>
                                                ) : !isLpmAdmin ? (
                                                    <span className="text-xs text-gray-400">Tidak ada aksi</span>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={filteredSchedules.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </section>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{editingSchedule ? 'Edit Jadwal Audit' : 'Buat Jadwal Audit'}</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Jadwal yang dibuat harus disetujui auditor dan auditee yang ditugaskan.
                                </p>
                            </div>
                            <button type="button" onClick={closeModal} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
                                <Icon icon={Icons.close} width={20} />
                            </button>
                        </div>

                        <form onSubmit={submitSchedule} className="space-y-6 px-6 py-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Judul Jadwal</span>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Standar</span>
                                    <select
                                        value={form.standard_id}
                                        onChange={(event) => setForm((current) => ({ ...current, standard_id: event.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Tanpa standar spesifik</option>
                                        {metadata.standards.map((standard) => (
                                            <option key={standard.id} value={standard.id}>
                                                {standard.name} ({standard.periode_tahun})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Fakultas</span>
                                    <select
                                        value={form.faculty_id}
                                        onChange={(event) => setForm((current) => ({ ...current, faculty_id: event.target.value, prodi_id: '' }))}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Pilih fakultas</option>
                                        {metadata.faculties.map((faculty) => (
                                            <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Prodi</span>
                                    <select
                                        value={form.prodi_id}
                                        onChange={(event) => setForm((current) => ({ ...current, prodi_id: event.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Pilih prodi</option>
                                        {prodiOptions.map((prodi) => (
                                            <option key={prodi.id} value={prodi.id}>{prodi.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Lead Auditor</span>
                                    <select
                                        value={form.lead_auditor_id}
                                        onChange={(event) => setForm((current) => ({ ...current, lead_auditor_id: event.target.value }))}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Pilih lead auditor</option>
                                        {metadata.lead_auditors.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.email})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Auditor</span>
                                    <select
                                        value={form.auditor_id}
                                        onChange={(event) => setForm((current) => ({ ...current, auditor_id: event.target.value }))}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Pilih auditor</option>
                                        {metadata.auditors.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.email})</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Mulai Audit</span>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduled_start}
                                        onChange={(event) => setForm((current) => ({ ...current, scheduled_start: event.target.value }))}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Selesai Audit</span>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduled_end}
                                        onChange={(event) => setForm((current) => ({ ...current, scheduled_end: event.target.value }))}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Icon icon={Icons.save} width={16} />
                                    {submitting ? 'Menyimpan...' : editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
