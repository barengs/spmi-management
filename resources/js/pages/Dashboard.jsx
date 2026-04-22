import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import Icon, { Icons } from '../components/ui/Icon';

const auditTimeline = [
    {
        key: 'draft',
        title: 'Pembuatan',
        description: 'Dokumen audit atau standar masih disusun dan direvisi oleh tim pengelola.',
    },
    {
        key: 'lpi_approval',
        title: 'Menunggu Approval LPI',
        description: 'Dokumen sudah diajukan, tetapi hasil review auditor/LPI belum dikirim ke pimpinan.',
    },
    {
        key: 'head_lpmi_approval',
        title: 'Menunggu Approval Kepala LPMI',
        description: 'Review auditor sudah lengkap dan proses saat ini menunggu keputusan pimpinan.',
    },
    {
        key: 'published',
        title: 'Diterbitkan',
        description: 'Siklus sudah disetujui dan resmi menjadi acuan yang berjalan.',
    },
];

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

function getCyclePeriodStatus(items) {
    if (!items.length) {
        return 'Non Aktif';
    }

    if (items.every((item) => item.status === 'TERBIT')) {
        return 'Dilaksanakan';
    }

    if (items.some((item) => item.status === 'WAITING_APPROVAL' || item.status === 'REVISI' || item.is_active)) {
        return 'Dalam Proses';
    }

    return 'Non Aktif';
}

export default function Dashboard() {
    const user = useSelector((state) => state.auth.user);
    const [standards, setStandards] = useState([]);
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('');

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
                status: 'Non Aktif',
            };
        }

        const isCurrentYear = selected.period === currentYear;
        const selectedItems = standards.filter((item) => Number(item.periode_tahun) === selected.period);

        return {
            label: `SPMI ${selected.period}`,
            period: selected.period,
            status: getCyclePeriodStatus(selectedItems),
            description: isCurrentYear
                ? `Siklus tahun ${currentYear} sudah diterapkan sebagai siklus berjalan.`
                : `Siklus tahun ${currentYear} belum diterapkan, sehingga sistem menampilkan siklus aktif sebelumnya.`,
        };
    }, [standards]);

    const availablePeriods = useMemo(() => {
        const periods = Array.from(
            new Set(
                standards
                    .map((item) => item.periode_tahun)
                    .filter(Boolean)
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value))
            )
        ).sort((left, right) => right - left);

        return periods;
    }, [standards]);

    useEffect(() => {
        if (!availablePeriods.length) {
            if (selectedPeriod !== '') {
                setSelectedPeriod('');
            }
            return;
        }

        if (!selectedPeriod && cycleSummary.period) {
            setSelectedPeriod(String(cycleSummary.period));
            return;
        }

        const exists = availablePeriods.includes(Number(selectedPeriod));
        if (!exists) {
            setSelectedPeriod(String(availablePeriods[0]));
        }
    }, [availablePeriods, cycleSummary.period, selectedPeriod]);

    const currentCycleStandards = useMemo(() => {
        const activePeriod = selectedPeriod || (cycleSummary.period ? String(cycleSummary.period) : '');

        if (!activePeriod) {
            return [];
        }

        return standards.filter((item) => Number(item.periode_tahun) === Number(activePeriod));
    }, [cycleSummary.period, selectedPeriod, standards]);

    const displayedCycleLabel = selectedPeriod ? `SPMI ${selectedPeriod}` : cycleSummary.label;

    const auditProgress = useMemo(() => {
        if (currentCycleStandards.length === 0) {
            return {
                currentStep: 'draft',
                headline: 'Belum ada proses audit yang berjalan',
                helper: 'Sistem belum menemukan dokumen pada siklus ini, sehingga timeline dimulai dari tahap pembuatan.',
            };
        }

        const hasPublished = currentCycleStandards.some((item) => item.status === 'TERBIT');
        const waitingItems = currentCycleStandards.filter((item) => item.status === 'WAITING_APPROVAL');
        const waitingHeadLpmi = waitingItems.some((item) => item.approval_stage === 'HEAD_LPMI');
        const waitingWr = waitingItems.some((item) => item.approval_stage === 'WR');
        const waitingRector = waitingItems.some((item) => item.approval_stage === 'RECTOR');

        if (hasPublished) {
            return {
                currentStep: 'published',
                headline: `Siklus ${displayedCycleLabel} sudah diterbitkan`,
                helper: 'Dokumen pada periode ini sudah melewati tahapan review dan approval.',
            };
        }

        if (waitingRector) {
            return {
                currentStep: 'head_lpmi_approval',
                headline: 'Proses saat ini menunggu Pimpinan / Rektor',
                helper: 'Seluruh persetujuan Kepala LPMI dan Wakil Rektor sudah lengkap, lalu menunggu keputusan final.',
            };
        }

        if (waitingWr) {
            return {
                currentStep: 'head_lpmi_approval',
                headline: 'Proses saat ini menunggu Wakil Rektor 1, 2, dan 3',
                helper: 'Kepala LPMI sudah menyetujui dan dokumen sedang menunggu persetujuan seluruh Wakil Rektor.',
            };
        }

        if (waitingHeadLpmi) {
            return {
                currentStep: 'lpi_approval',
                headline: 'Proses saat ini menunggu Kepala LPMI',
                helper: 'Dokumen sudah diajukan admin dan sedang menunggu persetujuan awal Kepala LPMI.',
            };
        }

        return {
            currentStep: 'draft',
            headline: 'Proses audit masih berada pada tahap pembuatan',
            helper: 'Dokumen masih dalam status draft atau revisi sebelum diajukan ke tahapan approval.',
        };
    }, [currentCycleStandards, displayedCycleLabel]);

    const currentTimelineIndex = auditTimeline.findIndex((item) => item.key === auditProgress.currentStep);

    const auditTimelineDetails = useMemo(() => {
        const byStatus = (status) => currentCycleStandards.filter((item) => item.status === status);
        const getEarliest = (items, field) => {
            const values = items
                .map((item) => item?.[field])
                .filter(Boolean)
                .sort((left, right) => new Date(left) - new Date(right));

            return values[0] || null;
        };
        const getLatest = (items, field) => {
            const values = items
                .map((item) => item?.[field])
                .filter(Boolean)
                .sort((left, right) => new Date(right) - new Date(left));

            return values[0] || null;
        };

        const waitingItems = byStatus('WAITING_APPROVAL');
        const submittedToHeadItems = waitingItems.filter((item) => item.approval_stage === 'WR' || item.approval_stage === 'RECTOR');
        const publishedItems = byStatus('TERBIT');
        return {
            draft: {
                startedAt: getEarliest(currentCycleStandards, 'created_at'),
                finishedAt: getEarliest(waitingItems, 'updated_at') || getEarliest(waitingItems, 'created_at') || null,
            },
            lpi_approval: {
                startedAt: getEarliest(waitingItems, 'created_at'),
                finishedAt: getEarliest(submittedToHeadItems, 'head_lpmi_approved_at') || null,
            },
            head_lpmi_approval: {
                startedAt: getEarliest(submittedToHeadItems, 'head_lpmi_approved_at') || getEarliest(waitingItems.filter((item) => item.approval_stage === 'RECTOR'), 'wr1_approved_at'),
                finishedAt: getEarliest(publishedItems, 'updated_at') || getEarliest(waitingItems.filter((item) => item.approval_stage === 'RECTOR'), 'wr3_approved_at') || null,
            },
            published: {
                startedAt: getEarliest(publishedItems, 'updated_at') || getEarliest(publishedItems, 'created_at'),
                finishedAt: getLatest(publishedItems, 'updated_at') || null,
            },
        };
    }, [currentCycleStandards]);

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
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Siklus Aktif</p>
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

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                            <Icon icon={Icons.audit} width={14} />
                            Proses Audit
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold text-gray-900">{auditProgress.headline}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{auditProgress.helper}</p>
                    </div>
                    <label className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Periode Dipantau</div>
                        <select
                            value={selectedPeriod}
                            onChange={(event) => setSelectedPeriod(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            disabled={availablePeriods.length === 0}
                        >
                            {availablePeriods.length === 0 ? (
                                <option value="">Belum ada periode</option>
                            ) : (
                                availablePeriods.map((period) => (
                                    <option key={period} value={period}>
                                        SPMI {period}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-4">
                    {auditTimeline.map((step, index) => {
                        const isCurrent = index === currentTimelineIndex;
                        const isDone = index < currentTimelineIndex;
                        const detail = auditTimelineDetails[step.key] || {};

                        return (
                            <div key={step.key} className="relative">
                                <div className={`relative h-full rounded-3xl border p-5 transition ${
                                    isCurrent
                                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                                        : isDone
                                            ? 'border-emerald-200 bg-emerald-50/70'
                                            : 'border-gray-200 bg-white'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${
                                            isCurrent
                                                ? 'bg-blue-600 text-white'
                                                : isDone
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {isDone ? <Icon icon={Icons.check} width={18} /> : index + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Tahap {index + 1}</div>
                                            <div className="text-base font-semibold text-gray-900">{step.title}</div>
                                        </div>
                                    </div>

                                    <p className="mt-4 text-sm leading-6 text-gray-600">{step.description}</p>

                                    <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-gray-500">Mulai</span>
                                            <span className="text-right font-medium text-gray-900">{formatDateTime(detail.startedAt)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-gray-500">Selesai</span>
                                            <span className="text-right font-medium text-gray-900">
                                                {isCurrent ? '-' : formatDateTime(detail.finishedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                                            isCurrent
                                                ? 'bg-blue-100 text-blue-700'
                                                : isDone
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {isCurrent ? 'Sedang Berjalan' : isDone ? 'Selesai' : 'Menunggu'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-3xl border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                Fase 6: Dashboard analytic IKU akan dilanjutkan pada sprint berikutnya.
            </section>
        </div>
    );
}
