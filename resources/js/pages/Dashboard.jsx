import React, { useEffect, useMemo, useState } from 'react';
import { getCached } from '../services/api';
import { useAuth } from '../services/authStore';
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

function getCycleWindow(period, durationMonths) {
    const numericPeriod = Number(period);
    const numericDuration = Number(durationMonths);

    if (!Number.isFinite(numericPeriod) || !Number.isFinite(numericDuration) || numericDuration < 1) {
        return {
            start: null,
            end: null,
            ended: false,
        };
    }

    const start = new Date(numericPeriod, 0, 1, 0, 0, 0, 0);
    const end = new Date(numericPeriod, numericDuration, 0, 23, 59, 59, 999);
    const now = new Date();

    return {
        start,
        end,
        ended: now.getTime() > end.getTime(),
    };
}

export default function Dashboard() {
    const { user } = useAuth();
    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);
    const isPerumus = roleNames.includes('Perumus');
    const [standards, setStandards] = useState([]);
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [cycleDurationMonths, setCycleDurationMonths] = useState(4);
    const [improvementSummary, setImprovementSummary] = useState([]);

    useEffect(() => {
        const fetchDashboardContext = async () => {
            try {
                const [standardsResponse, cycleDurationResponse, improvementResponse] = await Promise.all([
                    getCached('/standards'),
                    getCached('/settings/cycle-duration').catch(() => null),
                    getCached('/improvements/summary').catch(() => null),
                ]);

                setStandards(standardsResponse.data.data || []);
                setCycleDurationMonths(cycleDurationResponse?.data?.data?.duration_months || 4);
                setImprovementSummary(improvementResponse?.data?.data || []);
            } catch (error) {
                setStandards([]);
                setImprovementSummary([]);
            } finally {
                setLoadingCycle(false);
            }
        };

        fetchDashboardContext();
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
                window: { start: null, end: null, ended: false },
            };
        }

        const isCurrentYear = selected.period === currentYear;
        const selectedItems = standards.filter((item) => Number(item.periode_tahun) === selected.period);
        const window = getCycleWindow(selected.period, cycleDurationMonths);
        const baseStatus = getCyclePeriodStatus(selectedItems);

        return {
            label: `SPMI ${selected.period}`,
            period: selected.period,
            status: window.ended && baseStatus !== 'Dilaksanakan' ? 'Berakhir' : baseStatus,
            description: isCurrentYear
                ? `Siklus tahun ${currentYear} menggunakan durasi target ${cycleDurationMonths} bulan sejak awal periode.`
                : `Siklus tahun ${currentYear} belum diterapkan, sehingga sistem menampilkan siklus aktif sebelumnya.`,
            window,
        };
    }, [cycleDurationMonths, standards]);

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
    const selectedImprovementSummary = useMemo(
        () => improvementSummary.find((item) => String(item.cycle_year) === String(selectedPeriod || cycleSummary.period)) || null,
        [cycleSummary.period, improvementSummary, selectedPeriod]
    );
    const selectedCycleWindow = useMemo(
        () => getCycleWindow(selectedPeriod || cycleSummary.period, cycleDurationMonths),
        [cycleDurationMonths, cycleSummary.period, selectedPeriod]
    );

    const auditProgress = useMemo(() => {
        if (currentCycleStandards.length === 0) {
            return {
                currentStep: 'draft',
                headline: 'Belum ada proses audit yang berjalan',
                helper: 'Sistem belum menemukan dokumen pada siklus ini, sehingga timeline dimulai dari tahap pembuatan.',
            };
        }

        if (selectedCycleWindow.ended) {
            const hasPublishedAfterEnd = currentCycleStandards.some((item) => item.status === 'TERBIT');

            return {
                currentStep: hasPublishedAfterEnd ? 'published' : 'head_lpmi_approval',
                headline: hasPublishedAfterEnd
                    ? `Siklus ${displayedCycleLabel} sudah selesai`
                    : `Siklus ${displayedCycleLabel} telah berakhir`,
                helper: hasPublishedAfterEnd
                    ? `Periode siklus ini sudah melewati batas ${cycleDurationMonths} bulan dan seluruh dokumen yang terbit dianggap selesai diproses.`
                    : `Periode siklus ini sudah melewati batas ${cycleDurationMonths} bulan. Dokumen yang belum terbit perlu dievaluasi pada siklus berikutnya.`,
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
                helper: 'Persetujuan Kepala LPMI dan Wakil Rektor terkait sudah lengkap, lalu menunggu keputusan final.',
            };
        }

        if (waitingWr) {
            return {
                currentStep: 'head_lpmi_approval',
                headline: 'Proses saat ini menunggu Wakil Rektor terkait',
                helper: 'Kepala LPMI sudah menyetujui dan dokumen sedang menunggu persetujuan Wakil Rektor sesuai kategori standar.',
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
    }, [currentCycleStandards, cycleDurationMonths, displayedCycleLabel, selectedCycleWindow.ended]);

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
                finishedAt: getEarliest(publishedItems, 'updated_at') || getEarliest(waitingItems.filter((item) => item.approval_stage === 'RECTOR'), 'wr1_approved_at') || null,
            },
            published: {
                startedAt: getEarliest(publishedItems, 'updated_at') || getEarliest(publishedItems, 'created_at'),
                finishedAt: getLatest(publishedItems, 'updated_at') || null,
            },
        };
    }, [currentCycleStandards]);

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
                            {!loadingCycle && cycleSummary.window?.end && (
                                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-blue-100">
                                    Berakhir {formatDateTime(cycleSummary.window.end)}
                                </p>
                            )}
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

            {!isPerumus && (
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

                <div className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                                <Icon icon={Icons.refresh} width={14} />
                                Ringkasan Peningkatan
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-gray-900">Siklus {selectedPeriod || cycleSummary.period || '-'}</h3>
                            <p className="mt-1 text-sm text-gray-600">
                                Perbandingan keputusan peningkatan standar berdasarkan hasil evaluasi dan tindak koreksi.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                        <div className="rounded-2xl bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Direvisi</div>
                            <div className="mt-2 text-2xl font-semibold text-emerald-700">{selectedImprovementSummary?.revisi || 0}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Dipertahankan</div>
                            <div className="mt-2 text-2xl font-semibold text-blue-700">{selectedImprovementSummary?.pertahankan || 0}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Dihapus</div>
                            <div className="mt-2 text-2xl font-semibold text-rose-700">{selectedImprovementSummary?.hapus || 0}</div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Total Keputusan</div>
                            <div className="mt-2 text-2xl font-semibold text-gray-900">{selectedImprovementSummary?.total || 0}</div>
                        </div>
                    </div>
                </div>
            </section>
            )}

            {isPerumus && (
                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                        <Icon icon={Icons.standard} width={14} />
                        Fokus Perumus
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-gray-900">Akun ini difokuskan untuk penyusunan standar</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                        Menu dan notifikasi yang tidak terkait langsung dengan pembuatan serta penyusunan dokumen standar disembunyikan untuk menyederhanakan alur kerja.
                    </p>
                </section>
            )}
        </div>
    );
}
