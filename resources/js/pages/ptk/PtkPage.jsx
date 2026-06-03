import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../services/authStore';
import Icon, { Icons } from '../../components/ui/Icon';

const statusStyles = {
    OPEN: 'bg-rose-100 text-rose-700 border-rose-200',
    RESPONDED: 'bg-amber-100 text-amber-700 border-amber-200',
    REVISION_REQUIRED: 'bg-orange-100 text-orange-700 border-orange-200',
    VERIFIED: 'bg-blue-100 text-blue-700 border-blue-200',
    CLOSED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const statusLabels = {
    OPEN: 'Perlu Tindak Lanjut',
    RESPONDED: 'Menunggu Verifikasi',
    REVISION_REQUIRED: 'Perlu Revisi',
    VERIFIED: 'Terverifikasi',
    CLOSED: 'Selesai',
};

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

export default function PtkPage() {
    const { user } = useAuth();
    const permissions = user?.permissions || [];
    const canRespond = permissions.includes('ptk.respond');
    const canVerify = permissions.includes('ptk.verify');
    const canClose = permissions.includes('ptk.close');

    const [ptks, setPtks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [submittingAction, setSubmittingAction] = useState('');
    const [updatingTargetDate, setUpdatingTargetDate] = useState(false);
    const [targetDateNote, setTargetDateNote] = useState('');
    const [targetCompletionDate, setTargetCompletionDate] = useState('');
    const [responseNote, setResponseNote] = useState('');
    const [verificationNote, setVerificationNote] = useState('');
    const [closureNote, setClosureNote] = useState('');
    const loadPtk = async () => {
        try {
            setLoading(true);
            const response = await api.get('/ptk');
            const items = response.data.data || [];
            setPtks(items);
            setSelectedId((current) => items.some((item) => item.id === current) ? current : items[0]?.id || null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data tindak koreksi gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPtk();
    }, []);

    const selectedPtk = useMemo(
        () => ptks.find((item) => item.id === selectedId) || null,
        [ptks, selectedId]
    );

    useEffect(() => {
        setTargetCompletionDate(selectedPtk?.target_completion_date || '');
        setTargetDateNote(selectedPtk?.target_date_response_note || '');
        setResponseNote(selectedPtk?.response_note || '');
        setVerificationNote(selectedPtk?.verification_note || '');
        setClosureNote(selectedPtk?.closure_note || '');
    }, [selectedPtk]);

    const summary = useMemo(() => ({
        total: ptks.length,
        open: ptks.filter((item) => ['OPEN', 'REVISION_REQUIRED'].includes(item.status)).length,
        waiting: ptks.filter((item) => item.status === 'RESPONDED').length,
        done: ptks.filter((item) => item.status === 'CLOSED').length,
    }), [ptks]);

    const submitAction = async (kind, payload) => {
        if (!selectedPtk) {
            return;
        }

        setSubmittingAction(kind);

        try {
            const response = await api.patch(`/ptk/${selectedPtk.id}/${kind}`, payload);
            toast.success(response.data.message);
            await loadPtk();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Aksi PTK gagal diproses.');
        } finally {
            setSubmittingAction('');
        }
    };

    const handleRespond = () => {
        if (!responseNote.trim()) {
            toast.warning('Tindak lanjut wajib diisi.');
            return;
        }

        submitAction('respond', { response_note: responseNote });
    };

    const handleRespondTargetDate = (action) => {
        if (action === 'reject' && !targetDateNote.trim()) {
            toast.warning('Catatan alasan penolakan target tanggal wajib diisi.');
            return;
        }

        submitAction('target-date/respond', {
            action,
            note: targetDateNote.trim() || null,
        });
    };

    const handleUpdateTargetDate = async () => {
        if (!selectedPtk) {
            return;
        }

        if (!targetCompletionDate) {
            toast.warning('Target tanggal koreksi wajib diisi.');
            return;
        }

        try {
            setUpdatingTargetDate(true);
            const response = await api.patch(`/ptk/${selectedPtk.id}/target-date`, {
                target_completion_date: targetCompletionDate,
            });
            toast.success(response.data.message);
            await loadPtk();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Target tanggal PTK gagal diperbarui.');
        } finally {
            setUpdatingTargetDate(false);
        }
    };

    const handleVerify = (action) => {
        if (!verificationNote.trim()) {
            toast.warning('Catatan verifikasi wajib diisi.');
            return;
        }

        submitAction('verify', {
            action,
            verification_note: verificationNote,
        });
    };

    const handleClose = () => {
        if (!closureNote.trim()) {
            toast.warning('Catatan penutupan wajib diisi.');
            return;
        }

        submitAction('close', { closure_note: closureNote });
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    <Icon icon={Icons.ptk} width={14} />
                    Tindak Koreksi
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Manajemen Tindak Koreksi</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    PTK dibuat oleh auditor saat audit ketika temuan memang perlu ditindaklanjuti secara formal, termasuk saat bukti kosong atau belum diunggah oleh auditee.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Total PTK</div>
                    <div className="mt-3 text-2xl font-semibold text-gray-900">{summary.total}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Perlu Tindak Lanjut</div>
                    <div className="mt-3 text-2xl font-semibold text-rose-700">{summary.open}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Menunggu Verifikasi</div>
                    <div className="mt-3 text-2xl font-semibold text-amber-700">{summary.waiting}</div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Selesai</div>
                    <div className="mt-3 text-2xl font-semibold text-emerald-700">{summary.done}</div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar PTK</h2>
                        <button
                            type="button"
                            onClick={loadPtk}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                        >
                            <Icon icon={Icons.refresh} width={14} />
                            Muat Ulang
                        </button>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Memuat daftar PTK...
                        </div>
                    ) : ptks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Belum ada tindak koreksi yang tercatat.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {ptks.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                        item.id === selectedId
                                            ? 'border-amber-300 bg-amber-50'
                                            : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-gray-900">
                                                {item.standard?.name || 'Standar tanpa nama'}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {item.metric?.type || '-'} • {item.assigned_unit?.name || item.assigned_user?.name || '-'}
                                            </div>
                                        </div>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyles[item.status] || 'border-gray-200 bg-gray-100 text-gray-700'}`}>
                                            {statusLabels[item.status] || item.status}
                                        </span>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{item.finding_summary}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    {!selectedPtk ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Pilih salah satu PTK untuk melihat detail dan memproses tindak lanjut.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{selectedPtk.standard?.name || 'Detail PTK'}</h2>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                        Periode {selectedPtk.standard?.periode_tahun || '-'} • Ditugaskan ke {selectedPtk.assigned_unit?.name || selectedPtk.assigned_user?.name || '-'}
                                    </p>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selectedPtk.status] || 'border-gray-200 bg-gray-100 text-gray-700'}`}>
                                    {statusLabels[selectedPtk.status] || selectedPtk.status}
                                </span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Temuan Auditor</div>
                                    <p className="mt-3 text-sm leading-6 text-gray-700">{selectedPtk.finding_summary}</p>
                                </div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Bukti Terkait</div>
                                    <div className="mt-3 text-sm text-gray-700">{selectedPtk.evidence?.title || '-'}</div>
                                    <div className="mt-1 text-xs text-gray-500">{selectedPtk.metric?.content || '-'}</div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border border-gray-200 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Dibuat</div>
                                    <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(selectedPtk.created_at)}</div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Respon Auditee</div>
                                    <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(selectedPtk.responded_at)}</div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Penutupan</div>
                                    <div className="mt-2 text-sm font-medium text-gray-900">{formatDateTime(selectedPtk.closed_at)}</div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Persetujuan Target Tanggal</div>
                                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                                    <div>
                                        <div className="text-xs text-amber-700">Target Auditor</div>
                                        <div className="mt-1 text-sm font-semibold text-amber-900">{selectedPtk.target_completion_date ? formatDateTime(selectedPtk.target_completion_date) : '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-amber-700">Status</div>
                                        <div className="mt-1 text-sm font-semibold text-amber-900">{selectedPtk.target_date_status || 'PENDING'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-amber-700">Direspons</div>
                                        <div className="mt-1 text-sm font-semibold text-amber-900">{formatDateTime(selectedPtk.target_date_responded_at)}</div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {selectedPtk.target_date_status === 'REJECTED' && selectedPtk.target_date_response_note && (
                                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                                                Komentar Penolakan Auditee
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-rose-900">
                                                {selectedPtk.target_date_response_note}
                                            </div>
                                        </div>
                                    )}

                                    {canCreate && ['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) && (
                                        <div className="mb-4 flex flex-wrap items-end gap-3">
                                            <label className="min-w-[220px] flex-1 space-y-2">
                                                <span className="text-sm font-medium text-amber-900">Ubah Target Tanggal Auditor</span>
                                                <input
                                                    type="date"
                                                    value={targetCompletionDate}
                                                    onChange={(event) => setTargetCompletionDate(event.target.value)}
                                                    className="w-full rounded-2xl border border-amber-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleUpdateTargetDate}
                                                disabled={updatingTargetDate}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Icon icon={Icons.save} width={16} />
                                                {updatingTargetDate ? 'Menyimpan...' : 'Perbarui Target'}
                                            </button>
                                        </div>
                                    )}

                                    <label className="mb-2 block text-sm font-medium text-amber-900">Catatan Persetujuan Target Tanggal</label>
                                    <textarea
                                        value={targetDateNote}
                                        onChange={(event) => setTargetDateNote(event.target.value)}
                                        rows={3}
                                        disabled={!canRespond || !['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) || selectedPtk.target_date_status === 'ACCEPTED' || submittingAction === 'target-date/respond'}
                                        className="w-full rounded-2xl border border-amber-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-amber-50/50"
                                        placeholder="Isi alasan jika target tanggal perlu ditolak atau beri catatan persetujuan."
                                    />
                                    <div className="mt-3 flex flex-wrap justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleRespondTargetDate('reject')}
                                            disabled={!canRespond || !['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) || selectedPtk.target_date_status === 'ACCEPTED' || submittingAction === 'target-date/respond'}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.delete} width={16} />
                                            Tolak Tanggal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRespondTargetDate('accept')}
                                            disabled={!canRespond || !['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) || selectedPtk.target_date_status === 'ACCEPTED' || submittingAction === 'target-date/respond'}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.check} width={16} />
                                            {submittingAction === 'target-date/respond' ? 'Memproses...' : 'Setujui Tanggal'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Tindak Lanjut Auditee</label>
                                    <textarea
                                        value={responseNote}
                                        onChange={(event) => setResponseNote(event.target.value)}
                                        rows={4}
                                        disabled={!canRespond || !['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) || selectedPtk.target_date_status !== 'ACCEPTED' || submittingAction === 'respond'}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-gray-50"
                                        placeholder="Jelaskan tindakan koreksi yang sudah dilakukan unit terkait."
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleRespond}
                                            disabled={!canRespond || !['OPEN', 'REVISION_REQUIRED'].includes(selectedPtk.status) || selectedPtk.target_date_status !== 'ACCEPTED' || submittingAction === 'respond'}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.save} width={16} />
                                            {submittingAction === 'respond' ? 'Menyimpan...' : 'Kirim Tindak Lanjut'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Catatan Verifikasi Auditor</label>
                                    <textarea
                                        value={verificationNote}
                                        onChange={(event) => setVerificationNote(event.target.value)}
                                        rows={3}
                                        disabled={!canVerify || selectedPtk.status !== 'RESPONDED' || submittingAction === 'verify'}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50"
                                        placeholder="Tuliskan hasil verifikasi auditor atas tindak lanjut yang diajukan."
                                    />
                                    <div className="mt-2 flex flex-wrap justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleVerify('reject')}
                                            disabled={!canVerify || selectedPtk.status !== 'RESPONDED' || submittingAction === 'verify'}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.delete} width={16} />
                                            Minta Revisi
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleVerify('accept')}
                                            disabled={!canVerify || selectedPtk.status !== 'RESPONDED' || submittingAction === 'verify'}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.check} width={16} />
                                            {submittingAction === 'verify' ? 'Memproses...' : 'Verifikasi'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Catatan Penutupan</label>
                                    <textarea
                                        value={closureNote}
                                        onChange={(event) => setClosureNote(event.target.value)}
                                        rows={3}
                                        disabled={!canClose || selectedPtk.status !== 'VERIFIED' || submittingAction === 'close'}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-gray-50"
                                        placeholder="Ringkas hasil akhir dan alasan penutupan PTK."
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            disabled={!canClose || selectedPtk.status !== 'VERIFIED' || submittingAction === 'close'}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Icon icon={Icons.locked} width={16} />
                                            {submittingAction === 'close' ? 'Menutup...' : 'Tutup PTK'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
