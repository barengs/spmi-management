import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import Icon, { Icons } from '../components/ui/Icon';

export default function Dashboard() {
    const user = useSelector((state) => state.auth.user);
    const [standards, setStandards] = useState([]);
    const [loadingCycle, setLoadingCycle] = useState(true);

    useEffect(() => {
        const fetchStandards = async () => {
            try {
                const response = await api.get('/standards');
                setStandards(response.data.data || []);
            } catch (error) {
                setStandards([]);
            } finally {
                setLoadingCycle(false);
            }
        };

        fetchStandards();
    }, []);

    const cycleSummary = useMemo(() => {
        const currentYear = new Date().getFullYear();

        const normalized = standards
            .filter((item) => item.periode_tahun)
            .map((item) => ({
                period: Number(item.periode_tahun),
                isActive: Boolean(item.is_active),
                isPublished: item.status === 'TERBIT',
            }))
            .filter((item) => Number.isFinite(item.period));

        const periodMap = normalized.reduce((carry, item) => {
            if (!carry[item.period]) {
                carry[item.period] = {
                    period: item.period,
                    hasActive: false,
                    hasPublished: false,
                };
            }

            carry[item.period].hasActive = carry[item.period].hasActive || item.isActive;
            carry[item.period].hasPublished = carry[item.period].hasPublished || item.isPublished;

            return carry;
        }, {});

        const periods = Object.values(periodMap).sort((left, right) => right.period - left.period);

        const appliedPeriods = periods.filter((item) => item.hasActive || item.hasPublished);
        const currentApplied = appliedPeriods.find((item) => item.period === currentYear);
        const previousApplied = appliedPeriods.find((item) => item.period < currentYear);
        const fallbackApplied = appliedPeriods[0] || null;
        const fallbackAny = periods.find((item) => item.period <= currentYear) || periods[0] || null;
        const selected = currentApplied || previousApplied || fallbackApplied || fallbackAny;

        if (!selected) {
            return {
                label: '-',
                period: null,
                description: 'Belum ada siklus SPMI yang terdaftar.',
                status: 'Belum tersedia',
            };
        }

        const isCurrentYear = selected.period === currentYear;
        const isApplied = selected.hasActive || selected.hasPublished;

        return {
            label: `SPMI ${selected.period}`,
            period: selected.period,
            status: isApplied ? 'Aktif' : 'Draft',
            description: isCurrentYear
                ? `Siklus tahun ${currentYear} sudah diterapkan sebagai siklus berjalan.`
                : `Siklus tahun ${currentYear} belum diterapkan, sehingga sistem menampilkan siklus aktif sebelumnya.`,
        };
    }, [standards]);

    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    <Icon icon={Icons.dashboard} width={14} />
                    Dashboard Eksekutif
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Selamat datang, {user?.name}!</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Ringkasan cepat untuk melihat konteks akun dan siklus SPMI yang sedang dipakai oleh sistem.
                </p>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600 p-6 text-white shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Current Cycle</p>
                            <h2 className="mt-3 text-3xl font-semibold">
                                {loadingCycle ? 'Memuat...' : cycleSummary.label}
                            </h2>
                            <p className="mt-3 max-w-xs text-sm leading-6 text-blue-50">
                                {loadingCycle ? 'Sistem sedang membaca periode standar aktif.' : cycleSummary.description}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/15 p-3">
                            <Icon icon={Icons.refresh} width={26} />
                        </div>
                    </div>

                    <div className="mt-6 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        {loadingCycle ? 'Sinkronisasi' : cycleSummary.status}
                    </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Unit Organisasi</p>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                            <Icon icon={Icons.home} width={24} />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">{user?.unit?.name || 'Tidak ada unit'}</p>
                            <p className="text-sm text-gray-500">Unit yang terhubung dengan akun saat ini.</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Role Anda</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {roleNames.length > 0 ? roleNames.map((role) => (
                            <span key={role} className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                {role}
                            </span>
                        )) : (
                            <span className="text-sm text-gray-400">Belum ada role</span>
                        )}
                    </div>
                    <p className="mt-4 text-sm text-gray-500">Hak akses menu dan aksi sistem mengikuti role yang aktif pada akun Anda.</p>
                </div>
            </section>

            <section className="rounded-3xl border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                Fase 6: Dashboard analytic IKU akan dilanjutkan pada sprint berikutnya.
            </section>
        </div>
    );
}
