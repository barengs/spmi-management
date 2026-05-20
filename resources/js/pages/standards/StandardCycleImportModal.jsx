import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Icon, { Icons } from '../../components/ui/Icon';

export default function StandardCycleImportModal({ isOpen, onClose, targetPeriod, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (!isOpen || !targetPeriod) {
            setCandidates([]);
            setSelectedIds([]);
            return;
        }

        const fetchCandidates = async () => {
            setLoading(true);
            try {
                const response = await api.get('/standards/cycle-import/candidates', {
                    params: { target_period: targetPeriod },
                });
                const items = response.data?.data || [];
                setCandidates(items);
                setSelectedIds(items.map((item) => item.source_standard_id));
            } catch (error) {
                setCandidates([]);
                setSelectedIds([]);
                toast.error(error.response?.data?.message || 'Gagal memuat daftar standar dari siklus lama.');
            } finally {
                setLoading(false);
            }
        };

        fetchCandidates();
    }, [isOpen, targetPeriod]);

    const selectedCount = selectedIds.length;
    const allSelected = candidates.length > 0 && selectedCount === candidates.length;

    const selectedLabel = useMemo(() => {
        if (selectedCount === 0) {
            return 'Belum ada standar dipilih';
        }

        return `${selectedCount} standar dipilih`;
    }, [selectedCount]);

    const toggleSelection = (sourceStandardId) => {
        setSelectedIds((current) => (
            current.includes(sourceStandardId)
                ? current.filter((id) => id !== sourceStandardId)
                : [...current, sourceStandardId]
        ));
    };

    const handleToggleAll = () => {
        setSelectedIds((current) => (
            current.length === candidates.length
                ? []
                : candidates.map((item) => item.source_standard_id)
        ));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!targetPeriod) {
            toast.warning('Pilih periode aktif terlebih dahulu.');
            return;
        }

        if (selectedIds.length === 0) {
            toast.warning('Pilih minimal satu standar yang akan diimpor.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post('/standards/cycle-import', {
                target_period: Number(targetPeriod),
                source_standard_ids: selectedIds,
            });

            toast.success(response.data?.message || 'Standar dari siklus lama berhasil diimpor.');
            onSuccess?.(response.data?.data || []);
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Impor standar dari siklus lama gagal dijalankan.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
                </div>

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="relative z-10 inline-block w-full transform overflow-hidden rounded-lg border bg-white text-left align-bottom shadow-xl transition-all dark:border-gray-700 dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
                    <form onSubmit={handleSubmit}>
                        <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                        Impor Standar Siklus Lama
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Pilih standar dari periode lama yang belum ada pada periode {targetPeriod}. Standar terpilih akan disalin ke periode ini dengan status Draft.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label="Tutup"
                                >
                                    <Icon icon={Icons.close} width={20} />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        Periode tujuan: {targetPeriod}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedLabel}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleAll}
                                    disabled={loading || candidates.length === 0}
                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    {allSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                                </button>
                            </div>

                            <div className="mt-4 max-h-[26rem] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                {loading ? (
                                    <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Memuat daftar standar yang dapat diimpor...
                                    </div>
                                ) : candidates.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Semua standar yang relevan sudah tersedia pada periode {targetPeriod}.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {candidates.map((candidate) => {
                                            const checked = selectedIds.includes(candidate.source_standard_id);

                                            return (
                                                <label
                                                    key={candidate.source_standard_id}
                                                    className="flex cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleSelection(candidate.source_standard_id)}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {candidate.name}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                                                                    {candidate.category}
                                                                </span>
                                                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                                    Sumber {candidate.source_period}
                                                                </span>
                                                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                                                    {candidate.source_status || 'DRAFT'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {candidate.referensi_regulasi || 'Tanpa referensi regulasi'}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700/50">
                            <button
                                type="submit"
                                disabled={submitting || loading || candidates.length === 0}
                                className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm sm:ml-3 sm:w-auto ${
                                    submitting || loading || candidates.length === 0
                                        ? 'cursor-not-allowed bg-blue-400'
                                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                }`}
                            >
                                {submitting ? 'Mengimpor...' : 'Impor ke Periode Ini'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
