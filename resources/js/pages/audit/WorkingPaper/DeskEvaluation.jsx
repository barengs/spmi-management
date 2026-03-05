import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSave, FiCheckCircle, FiAlertTriangle, FiFileText, FiLink } from 'react-icons/fi';
import api from '../../../services/api';

export default function DeskEvaluation() {
    const { id: scheduleId } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [groupedData, setGroupedData] = useState([]);
    const [loading, setLoading] = useState(true);

    // State form: menyimpan { metric_target_id: { auditor_score, status, auditor_notes } }
    const [papers, setPapers] = useState({});

    // Status sinkronisasi (saving spinner)
    const [syncing, setSyncing] = useState(false);

    // Untuk debouncing auto-save
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        fetchWorkingPaper();
    }, [scheduleId]);

    const fetchWorkingPaper = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/audit/schedules/${scheduleId}/working-papers`);
            setSchedule(res.data.schedule);
            setGroupedData(res.data.data);

            // Inisialisasi state kertas kerja dari data yang sudah disave di DB jika ada
            const initialPapers = {};
            res.data.data.forEach(group => {
                group.targets.forEach(target => {
                    const saved = target.working_papers && target.working_papers.length > 0 ? target.working_papers[0] : null;
                    initialPapers[target.id] = {
                        auditor_score: saved?.auditor_score ?? '',
                        status: saved?.status ?? '',
                        auditor_notes: saved?.auditor_notes ?? ''
                    };
                });
            });
            setPapers(initialPapers);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal merender data kertas kerja');
        } finally {
            setLoading(false);
        }
    };

    // Fungsi trigger API Auto-Save khusus per 1 baris (satu metric_target_id)
    const triggerAutoSave = async (metricTargetId, payload) => {
        try {
            setSyncing(true);
            await api.post(`/audit/schedules/${scheduleId}/working-papers`, {
                metric_target_id: metricTargetId,
                ...payload
            });
            console.log(`Auto-saved metric_target_id: ${metricTargetId}`);
        } catch (error) {
            toast.error('Gagal sinkronisasi data kertas kerja');
        } finally {
            setTimeout(() => setSyncing(false), 500); // efek brief spinner
        }
    };

    // Handler ketika field input (skor, status, notes) berubah
    const handleChange = (metricTargetId, field, value) => {
        setPapers(prev => {
            const updated = {
                ...prev,
                [metricTargetId]: {
                    ...prev[metricTargetId],
                    [field]: value
                }
            };

            // Clear previous timeout if user is typing fast
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set a debounce timeout to trigger Auto-Save (e.g., 2 detik setelah user selesai mengetik)
            saveTimeoutRef.current = setTimeout(() => {
                triggerAutoSave(metricTargetId, updated[metricTargetId]);
            }, 2000);

            return updated;
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        );
    }

    if (!schedule) {
        return <div className="p-8 text-center text-red-500">Data Jadwal Audit tidak ditemukan.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-5.5rem)] -mx-6 -mb-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            {/* Header Sticky Dashboard Auditor */}
            <div className="bg-white dark:bg-gray-800 px-8 lg:px-12 py-4 shadow-sm z-10 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <Link to="/audit/periods" className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
                        <FiArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            Kertas Kerja: Unit <span className="text-indigo-600 dark:text-indigo-400">{schedule.unit.name}</span>
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Periode: {schedule.period?.name} | Siklus: {schedule.period?.cycle}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center text-sm font-medium">
                        {syncing ? (
                            <span className="flex items-center text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full">
                                <div className="animate-spin h-3 w-3 border-b-2 border-yellow-500 rounded-full mr-2"></div>
                                Menyimpan...
                            </span>
                        ) : (
                            <span className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                                <FiCheckCircle className="mr-1.5 h-4 w-4" /> Tersimpan
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* KOLOM KIRI: Capaian Prodi & Referensi Standar (Scrollable) */}
                <div className="w-1/2 overflow-y-auto p-8 lg:p-12 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700">
                    <div className="mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Panduan & Bukti Prodi</h2>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                            Silakan pelajari target standar dan tautan bukti fisik (dokumen/URL) yang telah diajukan oleh Program Studi.
                        </div>
                    </div>

                    <div className="space-y-8 pb-12">
                        {groupedData.map((group) => (
                            <div key={group.standard.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="bg-gray-100 dark:bg-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                        <FiFileText className="mr-2 text-indigo-500" />
                                        {group.standard.name}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {group.targets.map(target => {
                                        const assessmentId = target.self_assessments && target.self_assessments.length > 0 ? target.self_assessments[0] : null;
                                        const evidences = assessmentId?.evidences || [];

                                        return (
                                            <div key={target.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{target.metric?.statement}</p>
                                                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                        Kode: <span className="font-medium">{target.metric?.code}</span>
                                                    </span>
                                                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                                        Target: <span className="font-bold">{target.target_value} {target.measure_unit}</span>
                                                    </span>
                                                </div>

                                                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Self Assessment Prodi</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${assessmentId?.claimed_score ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                            Skor: {assessmentId?.claimed_score ?? '-'}
                                                        </span>
                                                    </div>

                                                    {evidences.length > 0 ? (
                                                        <div className="space-y-1 mt-2">
                                                            {evidences.map(ev => (
                                                                <a key={ev.id} href={ev.file_path} target="_blank" rel="noreferrer" className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-white dark:bg-gray-700/50 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors">
                                                                    <FiLink className="mr-1.5 h-3 w-3" />
                                                                    <span className="truncate">{ev.name}</span>
                                                                    {ev.pivot?.is_rpl && <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold">RPL</span>}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-1 flex items-center">
                                                            <FiAlertTriangle className="mr-1 h-3 w-3" /> Tidak ada lampiran bukti
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* KOLOM KANAN: Form Input Kertas Kerja Asesor (Scrollable independent) */}
                <div className="w-1/2 overflow-y-auto p-8 lg:p-12 bg-white dark:bg-gray-800">
                    <div className="mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Penilaian Asesor (Auto-Save)</h2>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                            Masukkan hasil verifikasi Anda. Sistem akan menyimpan secara otomatis <b>setiap 2 detik</b> setelah Anda berhenti mengetik.
                        </div>
                    </div>

                    <div className="space-y-8 pb-12">
                        {groupedData.map((group) => (
                            <div key={`form-${group.standard.id}`} className="bg-white dark:bg-gray-800 border-l-[3px] border-indigo-500 pl-4 py-2 opacity-95">
                                <div className="mb-4 mt-2">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300">Form: {group.standard.name}</h4>
                                </div>
                                <div className="space-y-6">
                                    {group.targets.map(target => {
                                        const formInput = papers[target.id] || { auditor_score: '', status: '', auditor_notes: '' };

                                        return (
                                            <div key={`input-${target.id}`} className="bg-gray-50 dark:bg-gray-800/80 rounded border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                                                <div className="flex gap-4 mb-4">
                                                    <div className="w-1/3">
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Skor Verifikasi Ketercapaian</label>
                                                        <input
                                                            type="number" step="0.01" min="0" max="4"
                                                            value={formInput.auditor_score}
                                                            onChange={(e) => handleChange(target.id, 'auditor_score', e.target.value)}
                                                            className="w-full text-sm rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                                            placeholder="0.00 - 4.00"
                                                        />
                                                    </div>
                                                    <div className="w-2/3">
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Status Temuan Audit</label>
                                                        <select
                                                            value={formInput.status}
                                                            onChange={(e) => handleChange(target.id, 'status', e.target.value)}
                                                            className="w-full text-sm rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                                        >
                                                            <option value="">-- Pilih Status / Keputusan --</option>
                                                            <option value="SESUAI">Sesuai (Terpenuhi)</option>
                                                            <option value="MELAMPAUI">Melampaui (Sangat Baik)</option>
                                                            <option value="OB">OB (Observasi)</option>
                                                            <option value="KTS_MINOR">KTS Minor (Ketidaksesuaian)</option>
                                                            <option value="KTS_MAYOR">KTS Mayor (Pelanggaran Berat)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Catatan Auditor (Deskripsi Kualitatif)</label>
                                                    <textarea
                                                        rows="3"
                                                        value={formInput.auditor_notes}
                                                        onChange={(e) => handleChange(target.id, 'auditor_notes', e.target.value)}
                                                        className="w-full text-sm rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                                        placeholder="Tuliskan justifikasi penilaian, akar masalah, atau rekomendasi spesifik jika ada..."
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    );
}
