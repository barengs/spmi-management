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

export function buildNotifications(user, schedules = [], standards = []) {
    return [
        ...buildScheduleNotifications(user, schedules),
        ...buildStandardNotifications(user, standards),
    ].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
}
