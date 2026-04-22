function formatWrList(labels) {
    if (labels.length === 0) {
        return 'Wakil Rektor';
    }

    if (labels.length === 1) {
        return labels[0];
    }

    if (labels.length === 2) {
        return `${labels[0]} dan ${labels[1]}`;
    }

    return `${labels.slice(0, -1).join(', ')}, dan ${labels[labels.length - 1]}`;
}

export function getPendingWrLabels(item) {
    const pending = [];

    if (!item?.wr1_approved_at) pending.push('Wakil Rektor 1');
    if (!item?.wr2_approved_at) pending.push('Wakil Rektor 2');
    if (!item?.wr3_approved_at) pending.push('Wakil Rektor 3');

    return pending;
}

export function getApprovalStageLabel(stage, item = null) {
    if (stage === 'HEAD_LPMI') return 'Menunggu Kepala LPMI';
    if (stage === 'WR') return `Menunggu ${formatWrList(getPendingWrLabels(item))}`;
    if (stage === 'RECTOR') return 'Menunggu Pimpinan / Rektor';
    if (stage === 'FINAL') return 'Final';
    if (stage === 'REVISI') return 'Revisi';
    return 'Draft';
}

export function getWaitingApprovalLabel(item) {
    return getApprovalStageLabel(item?.approval_stage, item);
}

export function getStandardStatusLabel(item) {
    const status = item?.status || 'DRAFT';

    if (status === 'WAITING_APPROVAL') {
        return getWaitingApprovalLabel(item);
    }

    if (status === 'TERBIT') {
        return 'Terbit';
    }

    if (status === 'REVISI') {
        return 'Revisi';
    }

    return 'Draft';
}
