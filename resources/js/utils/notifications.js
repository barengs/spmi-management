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
    }).sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
}
