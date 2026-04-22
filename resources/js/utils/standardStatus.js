export function getApprovalStageLabel(stage) {
    if (stage === 'HEAD_LPMI') return 'Menunggu Kepala LPMI';
    if (stage === 'WR') return 'Menunggu Wakil Rektor 1, 2, dan 3';
    if (stage === 'RECTOR') return 'Menunggu Pimpinan / Rektor';
    if (stage === 'FINAL') return 'Final';
    if (stage === 'REVISI') return 'Revisi';
    return 'Draft';
}

export function getWaitingApprovalLabel(item) {
    return getApprovalStageLabel(item?.approval_stage);
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
