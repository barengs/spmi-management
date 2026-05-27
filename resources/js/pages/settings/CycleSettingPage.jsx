import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

export default function CycleSettingPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [durationMonths, setDurationMonths] = useState(4);
    const [defaultMonths, setDefaultMonths] = useState(4);

    useEffect(() => {
        const fetchSetting = async () => {
            try {
                const response = await api.get('/settings/cycle-duration');
                const payload = response.data.data;

                setDurationMonths(payload.duration_months ?? 4);
                setDefaultMonths(payload.default_months ?? 4);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Pengaturan siklus gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchSetting();
    }, []);

    const saveSetting = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const response = await api.put('/settings/cycle-duration', {
                duration_months: Number(durationMonths),
            });

            const payload = response.data.data;
            setDurationMonths(payload.duration_months ?? 4);
            setDefaultMonths(payload.default_months ?? 4);
            toast.success(response.data.message || 'Pengaturan siklus berhasil diperbarui.');
        } catch (error) {
            const message = error.response?.data?.message || 'Pengaturan siklus gagal disimpan.';
            const validationErrors = error.response?.data?.errors;

            if (validationErrors) {
                const firstError = Object.values(validationErrors).flat()[0];
                toast.error(firstError || message);
            } else {
                toast.error(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 sm:p-8">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <p className="text-sm text-gray-500">Memuat pengaturan siklus...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    <Icon icon={Icons.schedule} width={14} />
                    Super Administrator
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Pengaturan Siklus</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Atur berapa lama durasi standar untuk satu siklus dari tahap formulasi sampai approval. Nilai default sistem adalah {defaultMonths} bulan.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <form onSubmit={saveSetting} className="space-y-6">
                    <label className="block max-w-md space-y-2">
                        <span className="text-sm font-medium text-gray-700">Durasi Siklus Formulasi ke Approval</span>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={durationMonths}
                                onChange={(event) => setDurationMonths(event.target.value)}
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                            />
                            <span className="text-sm font-semibold text-gray-600">bulan</span>
                        </div>
                    </label>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        Pengaturan ini bersifat terkontrol dan menjadi acuan durasi target satu siklus penetapan standar dari formulasi hingga approval.
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={submitting ? Icons.refresh : Icons.save} width={18} className={submitting ? 'animate-spin' : ''} />
                            Simpan Pengaturan
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
