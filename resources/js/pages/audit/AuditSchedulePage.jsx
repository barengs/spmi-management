import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api, { getCached, invalidateCachedGet } from '../../services/api';
import { useAuth } from '../../services/authStore';
import Icon, { Icons } from '../../components/ui/Icon';
import TablePagination from '../../components/ui/TablePagination';

const initialForm = {
    faculty_id: '',
    prodi_id: '',
    lead_auditor_id: '',
    auditor_id: '',
    scheduled_start: '',
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

    if (schedule.lead_auditor_status !== 'APPROVED') {
        return {
            tone: 'waiting_auditor',
            label: 'Menunggu Lead Auditor',
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

function canOpenBorang(schedule) {
    return schedule.lead_auditor_status === 'APPROVED'
        && schedule.auditor_status === 'APPROVED'
        && schedule.auditee_status === 'APPROVED';
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

function toDateInput(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60000));
    return localDate.toISOString().slice(0, 10);
}

export default function AuditSchedulePage() {
    const PAGE_SIZE = 10;
    const { user } = useAuth();
    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name));
    const isLpmAdmin = roleNames.includes('LPM-Admin') || roleNames.includes('SuperAdmin');
    const [schedules, setSchedules] = useState([]);
    const [metadata, setMetadata] = useState({
        faculties: [],
        prodis: [],
        lead_auditors: [],
        auditors: [],
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
    const [scopeFilter, setScopeFilter] = useState('ALL');
    const [responseModal, setResponseModal] = useState({
        open: false,
        schedule: null,
        action: 'approve',
        note: '',
    });

    const mergeUpdatedSchedule = (updatedSchedule) => {
        if (!updatedSchedule?.id) {
            return;
        }

        setSchedules((current) => {
            const exists = current.some((item) => String(item.id) === String(updatedSchedule.id));

            if (!exists) {
                return current;
            }

            return current.map((item) => (
                String(item.id) === String(updatedSchedule.id) ? updatedSchedule : item
            ));
        });
    };

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await getCached('/audit-schedules');
            const nextSchedules = response.data.data || [];
            setSchedules(nextSchedules);
            return nextSchedules;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Jadwal audit gagal dimuat.');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        if (!isLpmAdmin) {
            return;
        }

        try {
            const response = await getCached('/audit-schedules/metadata');
            setMetadata(response.data.data || {
                faculties: [],
                prodis: [],
                lead_auditors: [],
                auditors: [],
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data pendukung jadwal audit gagal dimuat.');
        }
    };

    useEffect(() => {
        fetchSchedules();
        fetchMetadata();
    }, []);

    const selectedProdiMeta = useMemo(() => {
        if (!form.prodi_id) {
            return null;
        }

        if (editingSchedule?.prodi && String(editingSchedule.prodi.id) === String(form.prodi_id)) {
            return {
                id: editingSchedule.prodi.id,
                parent_id: editingSchedule.faculty?.id || null,
                name: editingSchedule.prodi.name,
                code: editingSchedule.prodi.code,
            };
        }

        return metadata.prodis.find((prodi) => String(prodi.id) === String(form.prodi_id)) || null;
    }, [editingSchedule, form.prodi_id, metadata.prodis]);

    const selectedFacultyMeta = useMemo(() => {
        const derivedFacultyId = selectedProdiMeta?.parent_id || form.faculty_id;

        if (!derivedFacultyId) {
            return null;
        }

        if (editingSchedule?.faculty && String(editingSchedule.faculty.id) === String(derivedFacultyId)) {
            return editingSchedule.faculty;
        }

        return metadata.faculties.find((faculty) => String(faculty.id) === String(derivedFacultyId)) || null;
    }, [editingSchedule, form.faculty_id, metadata.faculties, selectedProdiMeta]);

    const prodiOptions = useMemo(() => {
        const filtered = metadata.prodis.filter((prodi) => !form.faculty_id || String(prodi.parent_id) === String(form.faculty_id));

        if (editingSchedule?.prodi && !filtered.some((prodi) => String(prodi.id) === String(editingSchedule.prodi.id))) {
            filtered.push({
                id: editingSchedule.prodi.id,
                parent_id: editingSchedule.faculty?.id || null,
                name: editingSchedule.prodi.name,
                code: editingSchedule.prodi.code,
            });
        }

        return filtered;
    }, [editingSchedule, form.faculty_id, metadata.prodis]);

    const occupiedAuditorIds = useMemo(() => {
        const excludedScheduleId = editingSchedule?.id ? String(editingSchedule.id) : null;

        return new Set(
            schedules
                .filter((schedule) => !excludedScheduleId || String(schedule.id) !== excludedScheduleId)
                .flatMap((schedule) => [
                    schedule.lead_auditor?.id ? String(schedule.lead_auditor.id) : null,
                    schedule.auditor?.id ? String(schedule.auditor.id) : null,
                ])
                .filter(Boolean)
        );
    }, [editingSchedule?.id, schedules]);

    const sharedAuditorPool = useMemo(() => {
        const filtered = metadata.lead_auditors.filter((item) => !occupiedAuditorIds.has(String(item.id)));

        if (editingSchedule?.lead_auditor && !filtered.some((item) => String(item.id) === String(editingSchedule.lead_auditor.id))) {
            filtered.push({
                id: editingSchedule.lead_auditor.id,
                name: editingSchedule.lead_auditor.name,
                email: editingSchedule.lead_auditor.email,
                unit_id: null,
            });
        }

        if (editingSchedule?.auditor && !filtered.some((item) => String(item.id) === String(editingSchedule.auditor.id))) {
            filtered.push({
                id: editingSchedule.auditor.id,
                name: editingSchedule.auditor.name,
                email: editingSchedule.auditor.email,
                unit_id: null,
            });
        }

        return filtered.sort((left, right) => left.name.localeCompare(right.name, 'id-ID'));
    }, [editingSchedule, metadata.lead_auditors, occupiedAuditorIds]);

    const leadAuditorOptions = useMemo(() => (
        sharedAuditorPool.filter((item) => (
            String(item.id) === String(form.lead_auditor_id)
            || !form.auditor_id
            || String(item.id) !== String(form.auditor_id)
        ))
    ), [form.auditor_id, form.lead_auditor_id, sharedAuditorPool]);

    const auditorOptions = useMemo(() => {
        return sharedAuditorPool.filter((item) => (
            String(item.id) === String(form.auditor_id)
            || !form.lead_auditor_id
            || String(item.id) !== String(form.lead_auditor_id)
        ));
    }, [form.auditor_id, form.lead_auditor_id, sharedAuditorPool]);

    const openModal = () => {
        setForm(initialForm);
        setEditingSchedule(null);
        setModalOpen(true);
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setForm({
            faculty_id: schedule.faculty?.id ? String(schedule.faculty.id) : '',
            prodi_id: schedule.prodi?.id ? String(schedule.prodi.id) : '',
            lead_auditor_id: schedule.lead_auditor?.id ? String(schedule.lead_auditor.id) : '',
            auditor_id: schedule.auditor?.id ? String(schedule.auditor.id) : '',
            scheduled_start: toDateInput(schedule.scheduled_start),
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
                faculty_id: form.faculty_id || null,
                prodi_id: form.prodi_id || null,
            };
            const response = editingSchedule
                ? await api.put(`/audit-schedules/${editingSchedule.id}`, payload)
                : await api.post('/audit-schedules', payload);
            invalidateCachedGet('/audit-schedules');
            invalidateCachedGet('/audit-schedules/metadata');

            toast.success(response.data.message || (editingSchedule ? 'Jadwal audit berhasil diperbarui.' : 'Jadwal audit berhasil dibuat.'));
            await Promise.all([fetchSchedules(), fetchMetadata()]);
            closeModal();
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
            invalidateCachedGet('/audit-schedules');
            invalidateCachedGet('/audit-schedules/metadata');
            toast.success(response.data.message || 'Jadwal audit berhasil dihapus.');
            await Promise.all([fetchSchedules(), fetchMetadata()]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Jadwal audit gagal dihapus.');
        }
    };

    const getResponseRole = (schedule) => {
        const userId = user?.id;
        const userUnitId = user?.unit?.id ? String(user.unit.id) : null;

        if (!userId) {
            return null;
        }

        const isAssignedAuditor = String(schedule.auditor?.id) === String(userId);
        const isAssignedLeadAuditor = String(schedule.lead_auditor?.id) === String(userId);
        const isAssignedAuditee = String(schedule.auditee?.id) === String(userId)
            || (userUnitId && String(schedule.prodi?.id || '') === userUnitId);

        if (isAssignedLeadAuditor) {
            return schedule.lead_auditor_status === 'PENDING' ? 'LEAD_AUDITOR' : null;
        }

        if (isAssignedAuditor) {
            return schedule.auditor_status === 'PENDING' ? 'AUDITOR' : null;
        }

        if (isAssignedAuditee) {
            return schedule.auditee_status === 'PENDING' ? 'AUDITEE' : null;
        }

        return null;
    };

    const canRespond = (schedule) => Boolean(getResponseRole(schedule)) && schedule.overall_status !== 'APPROVED';

    const openResponseModal = (schedule, action) => {
        setResponseModal({
            open: true,
            schedule,
            action,
            note: '',
        });
    };

    const closeResponseModal = () => {
        if (respondingId) {
            return;
        }

        setResponseModal({
            open: false,
            schedule: null,
            action: 'approve',
            note: '',
        });
    };

    const submitResponse = async (event) => {
        event.preventDefault();

        if (!responseModal.schedule) {
            return;
        }

        if (responseModal.action === 'reject' && !responseModal.note.trim()) {
            toast.warning('Catatan penolakan wajib diisi.');
            return;
        }

        setRespondingId(responseModal.schedule.id);

        try {
            const response = await api.patch(`/audit-schedules/${responseModal.schedule.id}/respond`, {
                action: responseModal.action,
                note: responseModal.note.trim() || null,
            });
            invalidateCachedGet('/audit-schedules');

            mergeUpdatedSchedule(response.data.data);
            closeResponseModal();
            toast.success(response.data.message);
            void fetchSchedules();
            void fetchMetadata();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Respons jadwal audit gagal disimpan.');
        } finally {
            setRespondingId(null);
        }
    };

    const pendingApprovals = useMemo(() => (
        schedules.filter((schedule) => canRespond(schedule))
    ), [schedules]);

    const filteredSchedules = useMemo(() => (
        schedules.filter((schedule) => {
            const userId = user?.id ? String(user.id) : '';
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
            const matchesScope = scopeFilter === 'ALL' || (
                String(schedule.lead_auditor?.id || '') === userId
                || String(schedule.auditor?.id || '') === userId
                || String(schedule.auditee?.id || '') === userId
            );

            return matchesSearch && matchesStatus && matchesScope;
        })
    ), [scopeFilter, schedules, search, statusFilter, user?.id]);

    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE));
    const paginatedSchedules = useMemo(() => (
        filteredSchedules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    ), [filteredSchedules, page]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setPage(1);
    }, [scopeFilter, search, statusFilter]);

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

            {!isLpmAdmin && pendingApprovals.length > 0 && (
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-amber-900">Notifikasi Persetujuan Jadwal</h2>
                            <p className="mt-1 text-sm text-amber-800">
                                Anda memiliki {pendingApprovals.length} jadwal audit yang menunggu keputusan Anda.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {pendingApprovals.map((schedule) => (
                            <div key={`notice-${schedule.id}`} className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">{schedule.title}</div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            {schedule.prodi?.name || '-'} - {schedule.faculty?.name || '-'}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            Jadwal: {formatDateTime(schedule.scheduled_start)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openResponseModal(schedule, 'approve')}
                                            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                                        >
                                            <Icon icon={Icons.check} width={14} />
                                            Terima
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openResponseModal(schedule, 'reject')}
                                            className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                                        >
                                            <Icon icon={Icons.close} width={14} />
                                            Tolak
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Jadwal Audit</h2>
                    <span className="text-sm text-gray-500">{filteredSchedules.length} jadwal</span>
                </div>
                <div className={`grid gap-4 border-b border-gray-200 px-6 py-4 ${isLpmAdmin ? 'md:grid-cols-[minmax(0,1fr)_220px_180px]' : 'md:grid-cols-[minmax(0,1fr)_220px]'}`}>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Filter prodi, fakultas, lead auditor, auditor, atau auditee..."
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
                    {isLpmAdmin && (
                        <select
                            value={scopeFilter}
                            onChange={(event) => setScopeFilter(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        >
                            <option value="ALL">Semua Jadwal</option>
                            <option value="MINE">Jadwal Untuk Saya</option>
                        </select>
                    )}
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
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Approval Lead Auditor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Approval Auditor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Approval Auditee</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat jadwal audit...
                                    </td>
                                </tr>
                            ) : filteredSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Belum ada jadwal audit.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSchedules.map((schedule) => (
                                    <tr key={schedule.id} className="align-top hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{formatDateTime(schedule.scheduled_start)}</div>
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
                                            <ApprovalBadge label="Lead Auditor" status={schedule.lead_auditor_status} />
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
                                                {canOpenBorang(schedule) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.location.assign('/borang')}
                                                        className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                                                    >
                                                        <Icon icon={Icons.document} width={14} />
                                                        Ke Borang
                                                    </button>
                                                )}
                                                {canRespond(schedule) ? (
                                                    <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openResponseModal(schedule, 'approve')}
                                                        disabled={respondingId === schedule.id}
                                                        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Icon icon={Icons.check} width={14} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openResponseModal(schedule, 'reject')}
                                                        disabled={respondingId === schedule.id}
                                                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Icon icon={Icons.close} width={14} />
                                                        Reject
                                                    </button>
                                                    </>
                                                ) : !isLpmAdmin && !canOpenBorang(schedule) ? (
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
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Judul jadwal dibuat otomatis berdasarkan prodi dan fakultas yang dipilih.
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Fakultas</span>
                                    <input
                                        type="text"
                                        value={selectedFacultyMeta?.name || ''}
                                        readOnly
                                        placeholder="Akan terisi otomatis dari prodi"
                                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
                                    />
                                    <div className="text-xs text-gray-500">
                                        Fakultas ditentukan otomatis berdasarkan prodi yang dipilih.
                                    </div>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Prodi</span>
                                    <select
                                        value={form.prodi_id}
                                        onChange={(event) => {
                                            const nextProdiId = event.target.value;
                                            const nextProdi = metadata.prodis.find((prodi) => String(prodi.id) === String(nextProdiId));

                                            setForm((current) => ({
                                                ...current,
                                                prodi_id: nextProdiId,
                                                faculty_id: nextProdi?.parent_id ? String(nextProdi.parent_id) : '',
                                            }));
                                        }}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        <option value="">Pilih prodi</option>
                                        {metadata.prodis.map((prodi) => (
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
                                        {leadAuditorOptions.map((item) => (
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
                                        {auditorOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.email})</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-1">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Mulai Audit</span>
                                    <input
                                        type="date"
                                        value={form.scheduled_start}
                                        onChange={(event) => setForm((current) => ({ ...current, scheduled_start: event.target.value }))}
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

            {responseModal.open && responseModal.schedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {responseModal.action === 'approve' ? 'Terima Jadwal Audit' : 'Tolak Jadwal Audit'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {responseModal.schedule.title}
                                </p>
                            </div>
                            <button type="button" onClick={closeResponseModal} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
                                <Icon icon={Icons.close} width={20} />
                            </button>
                        </div>

                        <form onSubmit={submitResponse} className="space-y-5 px-6 py-6">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                <div><span className="font-semibold">Prodi:</span> {responseModal.schedule.prodi?.name || '-'}</div>
                                <div className="mt-1"><span className="font-semibold">Fakultas:</span> {responseModal.schedule.faculty?.name || '-'}</div>
                                <div className="mt-1"><span className="font-semibold">Jadwal:</span> {formatDateTime(responseModal.schedule.scheduled_start)}</div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                {responseModal.action === 'approve'
                                    ? 'Pilih terima untuk menyetujui undangan jadwal audit ini.'
                                    : 'Catatan penolakan wajib diisi sebelum jadwal dapat ditolak.'}
                            </div>

                            {responseModal.action === 'reject' && (
                                <label className="block space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Catatan Penolakan</span>
                                    <textarea
                                        rows="4"
                                        value={responseModal.note}
                                        onChange={(event) => setResponseModal((current) => ({ ...current, note: event.target.value }))}
                                        placeholder="Wajib diisi..."
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                    />
                                </label>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeResponseModal}
                                    className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={respondingId === responseModal.schedule.id}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        responseModal.action === 'approve'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    <Icon icon={responseModal.action === 'approve' ? Icons.check : Icons.close} width={16} />
                                    {respondingId === responseModal.schedule.id
                                        ? 'Menyimpan...'
                                        : responseModal.action === 'approve'
                                            ? 'Terima Undangan'
                                            : 'Tolak Undangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
