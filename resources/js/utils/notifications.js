import { getPendingWrLabels, getStandardWrLabel } from './standardStatus';

export function buildScheduleNotifications(user, schedules = []) {
    const userId = user?.id ? String(user.id) : null;
    const userUnitId = user?.unit?.id ? String(user.unit.id) : null;

    if (!userId) {
        return [];
    }

    return schedules.flatMap((schedule) => {
        const items = [];
        const scheduleLabel = `${schedule.prodi?.name || '-'} - ${schedule.faculty?.name || '-'}`;

        const isLeadAuditor = String(schedule.lead_auditor?.id || '') === userId;
        const isAuditor = String(schedule.auditor?.id || '') === userId;
        const isAuditee = String(schedule.auditee?.id || '') === userId
            || (userUnitId && String(schedule.prodi?.id || '') === userUnitId);

        if ((isLeadAuditor || isAuditor) && schedule.auditor_status === 'PENDING') {
            items.push({
                id: `schedule-${schedule.id}-auditor-pending`,
                type: 'schedule_approval',
                title: 'Persetujuan Jadwal Audit',
                message: `Jadwal audit ${scheduleLabel} menunggu persetujuan Anda sebagai auditor.`,
                href: '/audit/schedules',
                created_at: schedule.created_at || schedule.scheduled_start,
                tone: 'warning',
            });
        }

        if (isAuditee && schedule.auditee_status === 'PENDING') {
            items.push({
                id: `schedule-${schedule.id}-auditee-pending`,
                type: 'schedule_approval',
                title: 'Persetujuan Jadwal Audit',
                message: `Jadwal audit ${scheduleLabel} menunggu persetujuan Anda sebagai auditee.`,
                href: '/audit/schedules',
                created_at: schedule.created_at || schedule.scheduled_start,
                tone: 'warning',
            });
        }

        if ((isLeadAuditor || isAuditor || isAuditee) && schedule.overall_status === 'APPROVED') {
            items.push({
                id: `schedule-${schedule.id}-approved`,
                type: 'schedule_status',
                title: 'Jadwal Audit Disetujui',
                message: `Jadwal audit ${scheduleLabel} sudah disetujui dan siap dilaksanakan.`,
                href: '/audit/schedules',
                created_at: schedule.auditee_responded_at || schedule.auditor_responded_at || schedule.scheduled_start,
                tone: 'success',
            });
        }

        if ((isLeadAuditor || isAuditor || isAuditee) && schedule.overall_status === 'REJECTED') {
            items.push({
                id: `schedule-${schedule.id}-rejected`,
                type: 'schedule_status',
                title: 'Jadwal Audit Ditolak',
                message: `Jadwal audit ${scheduleLabel} ditolak. Silakan periksa detail respons pada jadwal audit.`,
                href: '/audit/schedules',
                created_at: schedule.auditee_responded_at || schedule.auditor_responded_at || schedule.scheduled_start,
                tone: 'error',
            });
        }

        return items;
    });
}

function getRoleNames(user) {
    return (user?.roles || [])
        .map((role) => (typeof role === 'string' ? role : role?.name))
        .filter(Boolean);
}

function hasRole(user, roleName) {
    return getRoleNames(user).includes(roleName);
}

export function buildStandardNotifications(user, standards = []) {
    if (!user?.id) {
        return [];
    }

    return standards.flatMap((standard) => {
        const items = [];

        if (standard?.status !== 'WAITING_APPROVAL') {
            return items;
        }

        const href = `/standards/${standard.id}/review`;
        const createdAt = standard.updated_at || standard.created_at;
        const label = `${standard.name || 'Standar Mutu'} (${standard.periode_tahun || '-'})`;

        if (standard.approval_stage === 'HEAD_LPMI' && hasRole(user, 'Kepala LPMI')) {
            items.push({
                id: `standard-${standard.id}-head-lpmi`,
                type: 'standard_approval',
                title: 'Approval Standar Menunggu Anda',
                message: `${label} menunggu persetujuan Anda sebagai Kepala LPMI.`,
                href,
                created_at: createdAt,
                tone: 'warning',
            });
        }

        if (
            standard.approval_stage === 'WR'
            && hasRole(user, getStandardWrLabel(standard))
            && getPendingWrLabels(standard).length > 0
        ) {
            items.push({
                id: `standard-${standard.id}-wr`,
                type: 'standard_approval',
                title: 'Approval Standar Menunggu Anda',
                message: `${label} menunggu persetujuan ${getPendingWrLabels(standard).join(', ')}.`,
                href,
                created_at: createdAt,
                tone: 'warning',
            });
        }

        if (
            standard.approval_stage === 'RECTOR'
            && !standard.rector_approved_at
            && (hasRole(user, 'Pimpinan') || hasRole(user, 'Rektor') || hasRole(user, 'SuperAdmin'))
        ) {
            items.push({
                id: `standard-${standard.id}-rector`,
                type: 'standard_approval',
                title: 'Approval Final Standar Menunggu Anda',
                message: `${label} sudah melewati Kepala LPMI dan ${getStandardWrLabel(standard)}, lalu menunggu keputusan final pimpinan.`,
                href,
                created_at: createdAt,
                tone: 'warning',
            });
        }

        return items;
    });
}

export function buildPtkNotifications(user, ptks = []) {
    const userId = user?.id ? String(user.id) : null;
    const userUnitId = user?.unit?.id ? String(user.unit.id) : null;

    if (!userId) {
        return [];
    }

    return ptks.flatMap((ptk) => {
        const items = [];
        const isAssignedAuditee = String(ptk.assigned_user?.id || '') === userId
            || (userUnitId && String(ptk.assigned_unit?.id || '') === userUnitId);
        const isAuditorActor = String(ptk.creator?.id || '') === userId;

        if (isAssignedAuditee && ptk.target_date_status === 'PENDING') {
            items.push({
                id: `ptk-${ptk.id}-target-date-pending`,
                type: 'ptk_target_date',
                title: 'Target Tanggal PTK Menunggu Persetujuan',
                message: `Auditor menetapkan target tindak koreksi pada ${ptk.target_completion_date || '-'}. Anda perlu menyetujui atau menolaknya.`,
                href: '/ptk',
                created_at: ptk.created_at,
                tone: 'warning',
            });
        }

        if (isAuditorActor && ptk.target_date_status === 'REJECTED') {
            items.push({
                id: `ptk-${ptk.id}-target-date-rejected`,
                type: 'ptk_target_date',
                title: 'Target Tanggal PTK Ditolak Auditee',
                message: `Auditee menolak target tanggal PTK.${ptk.target_date_response_note ? ` Komentar: ${ptk.target_date_response_note}` : ' Silakan tinjau ulang target koreksi.'}`,
                href: '/ptk',
                created_at: ptk.target_date_responded_at || ptk.updated_at,
                tone: 'error',
            });
        }

        if (isAuditorActor && ptk.status === 'RESPONDED') {
            items.push({
                id: `ptk-${ptk.id}-response-waiting`,
                type: 'ptk_response',
                title: 'Tindak Lanjut PTK Menunggu Verifikasi',
                message: 'Auditee sudah mengirim tindak lanjut PTK dan menunggu verifikasi auditor.',
                href: '/ptk',
                created_at: ptk.responded_at || ptk.updated_at,
                tone: 'warning',
            });
        }

        if (isAssignedAuditee && ptk.status === 'REVISION_REQUIRED') {
            items.push({
                id: `ptk-${ptk.id}-revision-required`,
                type: 'ptk_revision',
                title: 'PTK Dikembalikan untuk Revisi',
                message: 'Auditor meminta perbaikan lanjutan pada tindak koreksi yang Anda kirim.',
                href: '/ptk',
                created_at: ptk.verified_at || ptk.updated_at,
                tone: 'error',
            });
        }

        return items;
    });
}

export function buildNotifications(user, schedules = [], standards = [], ptks = []) {
    return [
        ...buildScheduleNotifications(user, schedules),
        ...buildStandardNotifications(user, standards),
        ...buildPtkNotifications(user, ptks),
    ].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
}
