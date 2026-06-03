export function normalizeStandardCategory(category) {
    if (category === 'SN-Dikti') return 'Pendidikan';
    if (category === 'Institusi') return 'Tambahan';
    return category || '-';
}

export function getStandardWrLabel(item) {
    const category = normalizeStandardCategory(item?.category);

    if (category === 'Pendidikan') return 'Wakil Rektor 3';
    if (category === 'Penelitian') return 'Wakil Rektor 2';
    if (category === 'Pengabdian') return 'Wakil Rektor 1';
    if (category === 'Tambahan') return 'Wakil Rektor 1';

    return 'Wakil Rektor 1';
}

function formatWrList(labels) {
    if (labels.length === 0) {
        return 'Wakil Rektor 1';
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

    const wrLabel = getStandardWrLabel(item);

    if (wrLabel === 'Wakil Rektor 3' && !item?.wr3_approved_at) pending.push(wrLabel);
    else if (wrLabel === 'Wakil Rektor 2' && !item?.wr2_approved_at) pending.push(wrLabel);
    else if (wrLabel === 'Wakil Rektor 1' && !item?.wr1_approved_at) pending.push(wrLabel);

    return pending;
}

export function getApprovalStageLabel(stage, item = null) {
    if (item?.status === 'TERBIT') return 'Final';
    if (item?.status === 'REVISI') return 'Revisi';
    if (item?.status === 'WAITING_APPROVAL' && !stage) return 'Menunggu Kepala LPMI';
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
