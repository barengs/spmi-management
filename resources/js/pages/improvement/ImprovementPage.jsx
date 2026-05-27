import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

const actionLabels = {
    REVISI: 'Revisi',
    PERTAHANKAN: 'Pertahankan',
    HAPUS: 'Hapus',
};

export default function ImprovementPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [findings, setFindings] = useState([]);
    const [improvements, setImprovements] = useState([]);
    const [selectedFindingId, setSelectedFindingId] = useState(null);
    const [form, setForm] = useState({
        action: 'REVISI',
        justification: '',
        target_period_year: String(new Date().getFullYear() + 1),
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/improvements');
            const payload = response.data.data || {};
            setFindings(payload.findings || []);
            setImprovements(payload.improvements || []);
            setSelectedFindingId((current) => current || payload.findings?.[0]?.id || null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Halaman peningkatan gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedFinding = useMemo(
        () => findings.find((item) => String(item.id) === String(selectedFindingId)) || null,
        [findings, selectedFindingId]
    );

    const handledFindingKeys = useMemo(
        () => new Set(improvements.filter((item) => item.finding?.id).map((item) => `${item.standard?.id}-${item.finding?.id}`)),
        [improvements]
    );

    const availableFindings = useMemo(
        () => findings.filter((item) => !handledFindingKeys.has(`${item.standard?.id}-${item.id}`)),
        [findings, handledFindingKeys]
    );

    useEffect(() => {
        if (!availableFindings.length) {
            setSelectedFindingId(null);
            return;
        }

        if (!availableFindings.some((item) => String(item.id) === String(selectedFindingId))) {
            setSelectedFindingId(availableFindings[0].id);
        }
    }, [availableFindings, selectedFindingId]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedFinding?.standard?.id) {
            toast.warning('Pilih temuan audit terlebih dahulu.');
            return;
        }

        if (!form.justification.trim()) {
            toast.warning('Justifikasi peningkatan wajib diisi.');
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.post('/improvements', {
                standard_id: selectedFinding.standard.id,
                finding_ptk_id: selectedFinding.id,
                action: form.action,
                justification: form.justification.trim(),
                target_period_year: form.action === 'REVISI' ? Number(form.target_period_year) : null,
            });
            toast.success(response.data.message || 'Workflow peningkatan berhasil disimpan.');
            setForm((current) => ({ ...current, justification: '' }));
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Workflow peningkatan gagal disimpan.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Icon icon={Icons.refresh} width={14} />
                    Peningkatan
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Workflow Revisi Standar Berbasis Temuan Audit</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Halaman ini menutup loop PPEPP dengan menarik temuan PTK, lalu mencatat keputusan apakah standar direvisi, dipertahankan, atau dihapus.
                </p>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Temuan Siap Diproses</h2>
                        <span className="text-sm text-gray-500">{availableFindings.length} item</span>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Memuat temuan peningkatan...
                        </div>
                    ) : availableFindings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Belum ada temuan audit yang siap diproses ke siklus peningkatan.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {availableFindings.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedFindingId(item.id)}
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                        String(selectedFindingId) === String(item.id)
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                                    }`}
                                >
                                    <div className="text-sm font-semibold text-gray-900">{item.standard?.name || '-'}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        v{item.standard?.version_number || 1} • periode {item.standard?.periode_tahun || '-'}
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{item.finding_summary}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    {!selectedFinding ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                            Pilih satu temuan audit untuk mulai proses peningkatan.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedFinding.standard?.name || 'Standar'}</h2>
                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                    Versi saat ini v{selectedFinding.standard?.version_number || 1} • indikator: {selectedFinding.metric?.content || '-'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Rekomendasi Tindak Lanjut / Temuan Audit</div>
                                <p className="mt-3 text-sm leading-6 text-gray-700">{selectedFinding.finding_summary}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Keputusan Peningkatan</label>
                                    <select
                                        value={form.action}
                                        onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                    >
                                        {Object.entries(actionLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {form.action === 'REVISI' && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Siklus / Periode Tujuan Re-Penetapan</label>
                                        <input
                                            type="number"
                                            value={form.target_period_year}
                                            onChange={(event) => setForm((current) => ({ ...current, target_period_year: event.target.value }))}
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Justifikasi Peningkatan</label>
                                    <textarea
                                        rows={5}
                                        value={form.justification}
                                        onChange={(event) => setForm((current) => ({ ...current, justification: event.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                                        placeholder="Jelaskan alasan perubahan standar dan kaitannya dengan temuan audit."
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Icon icon={Icons.save} width={16} />
                                        {submitting ? 'Menyimpan...' : 'Simpan Keputusan'}
                                    </button>
                                </div>
                            </form>

                            {selectedFinding.standard?.id ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                                    Jika memilih revisi, sistem membuat versi baru sebagai draft dan menyimpan versi lama di riwayat. Setelah versi baru diterbitkan, versi lama otomatis menjadi tidak aktif.
                                    <div className="mt-3">
                                        <Link to={`/standards/${selectedFinding.standard.id}`} className="font-semibold underline">
                                            Lihat standar saat ini
                                        </Link>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </section>
            </div>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Riwayat Peningkatan</h2>
                    <span className="text-sm text-gray-500">{improvements.length} keputusan</span>
                </div>

                {improvements.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">
                        Belum ada riwayat peningkatan standar.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {improvements.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {item.standard?.name || '-'} • {actionLabels[item.action] || item.action}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            v{item.standard?.version_number || 1}
                                            {item.new_standard ? ` → v${item.new_standard.version_number}` : ''}
                                            {item.cycle_year ? ` • siklus ${item.cycle_year}` : ''}
                                        </div>
                                    </div>
                                    {item.new_standard ? (
                                        <Link to={`/standards/${item.new_standard.id}`} className="text-sm font-semibold text-emerald-700 underline">
                                            Buka versi baru
                                        </Link>
                                    ) : null}
                                </div>
                                <p className="mt-3 text-sm leading-6 text-gray-600">{item.justification}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
