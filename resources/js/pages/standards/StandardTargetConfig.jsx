import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import EvidenceUploaderModal from '../../components/EvidenceUploaderModal';
import DocumentPreviewer from '../../components/DocumentPreviewer';
import { FiPaperclip, FiTrash2, FiEye } from 'react-icons/fi';
export default function StandardTargetConfig({ metric, isOpen, onClose }) {
    const [levels, setLevels] = useState([]);
    const [targets, setTargets] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
    const [selectedTargetId, setSelectedTargetId] = useState(null);
    const [previewData, setPreviewData] = useState({ isOpen: false, url: '', type: '', name: '' });
    // Default configuration template
    const defaultRow = {
        is_active: false, // UI only control
        target_value: '',
        measure_unit: 'Jumlah',
        data_source: 'Manual',
        evidence_type: 'File PDF'
    };

    useEffect(() => {
        if (isOpen && metric) {
            fetchData();
        }
    }, [isOpen, metric]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch education levels and existing targets simultaneously
            const [levelsRes, targetsRes] = await Promise.all([
                api.get('/education-levels'),
                api.get(`/metrics/${metric.id}/targets`)
            ]);

            const fetchedLevels = levelsRes.data.data;
            const fetchedTargets = targetsRes.data.data;

            setLevels(fetchedLevels);

            // Initialize form state
            const targetState = {};
            fetchedLevels.forEach(level => {
                // Check if target exists for this level
                const existing = fetchedTargets.find(t => t.level_id === level.id);
                if (existing) {
                    targetState[level.id] = {
                        id: existing.id,
                        is_active: true,
                        target_value: existing.target_value || '',
                        measure_unit: existing.measure_unit,
                        data_source: existing.data_source,
                        evidence_type: existing.evidence_type,
                        evidences: existing.evidences || []
                    };
                } else {
                    targetState[level.id] = { ...defaultRow, evidences: [] };
                }
            });

            setTargets(targetState);
        } catch (err) {
            toast.error('Gagal memuat data master atau target.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRowChange = (levelId, field, value) => {
        setTargets(prev => ({
            ...prev,
            [levelId]: {
                ...prev[levelId],
                [field]: value
            }
        }));
    };

    const handleUnlinkEvidence = async (levelId, targetId, evidenceId) => {
        if (!confirm('Apakah Anda yakin ingin melepaskan tautan dokumen ini dari indikator capaian?')) return;

        try {
            await api.delete('/evidences/unlink', {
                data: {
                    evidence_id: evidenceId,
                    metric_target_id: targetId
                }
            });
            toast.success('Tautan dokumen berhasil dilepas.');
            fetchData(); // Refresh UI
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal melepaskan dokumen.');
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Build payload containing only active rows
            const payloadArray = [];
            Object.keys(targets).forEach(levelId => {
                if (targets[levelId].is_active) {
                    payloadArray.push({
                        level_id: levelId,
                        target_value: targets[levelId].target_value,
                        measure_unit: targets[levelId].measure_unit,
                        data_source: targets[levelId].data_source,
                        evidence_type: targets[levelId].evidence_type
                    });
                }
            });

            await api.post(`/metrics/${metric.id}/targets/sync`, {
                targets: payloadArray
            });

            toast.success('Konfigurasi target berhasil disimpan.');
            onClose(); // Auto close on success
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan target diferensiasi.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="target-modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={saving ? undefined : onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full max-w-6xl">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl leading-6 font-bold text-gray-900 dark:text-white flex items-center gap-2" id="target-modal-title">
                                    <span className="text-2xl">🎯</span> Matriks Target Diferensiasi
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
                                    Pilih jenjang pendidikan yang diwajibkan untuk memenuhi indikator kinerja ini, lalu atur angka target dan metode pembuktiannya secara spesifik.
                                </p>
                            </div>
                            <button onClick={onClose} disabled={saving} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                                <span className="sr-only">Tutup</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Indikator Terpilih (ID #{metric?.id}):</h4>
                            <p className="mt-1 text-sm text-blue-900 dark:text-blue-200">{metric?.content}</p>
                        </div>
                    </div>

                    <div className="px-4 py-5 sm:p-6 max-h-[60vh] overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        {error && (
                            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                Memuat konfigurasi jenjang...
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    <thead className="bg-gray-100 dark:bg-gray-800/80">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-left border-r dark:border-gray-700 w-12">
                                                <span className="sr-only">Aktif</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-700 w-1/5">
                                                Jenjang Pendidikan
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-700">
                                                Angka Target
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-700">
                                                Satuan Ukur
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-700">
                                                Sumber Data (Sync)
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-700">
                                                Tipe Bukti
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                Lampiran Bukti
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {levels.map((level) => {
                                            const isActive = targets[level.id]?.is_active;
                                            const targetData = targets[level.id] || {};
                                            return (
                                                <tr key={level.id} className={`${isActive ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-transparent text-gray-400 dark:text-gray-500'} transition-colors`}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center border-r dark:border-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={isActive || false}
                                                            onChange={(e) => handleRowChange(level.id, 'is_active', e.target.checked)}
                                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium border-r dark:border-gray-700">
                                                        <div className={isActive ? 'text-gray-900 dark:text-white' : ''}>
                                                            {level.name}
                                                        </div>
                                                        <div className="text-xs text-gray-400">{level.code}</div>
                                                    </td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <input
                                                            type="text"
                                                            disabled={!isActive}
                                                            value={targetData.target_value || ''}
                                                            onChange={(e) => handleRowChange(level.id, 'target_value', e.target.value)}
                                                            placeholder={isActive ? "Cth: 100 / Unggul" : "Nonaktif"}
                                                            className={`block w-full sm:text-sm rounded-md border-gray-300 ${!isActive ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'} dark:border-gray-600 dark:text-white`}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <select
                                                            disabled={!isActive}
                                                            value={targetData.measure_unit || ''}
                                                            onChange={(e) => handleRowChange(level.id, 'measure_unit', e.target.value)}
                                                            className={`block w-full sm:text-sm rounded-md border-gray-300 ${!isActive ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'} dark:border-gray-600 dark:text-white`}
                                                        >
                                                            <option value="Jumlah">Jumlah (N)</option>
                                                            <option value="Persen">Persentase (%)</option>
                                                            <option value="Rupiah">Rupiah (Rp)</option>
                                                            <option value="Waktu/Bulan">Waktu/Bulan</option>
                                                            <option value="Skala">Skala Likert/Mutu</option>
                                                            <option value="Teks Dasar">Teks Dasar</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <select
                                                            disabled={!isActive}
                                                            value={targetData.data_source || ''}
                                                            onChange={(e) => handleRowChange(level.id, 'data_source', e.target.value)}
                                                            className={`block w-full sm:text-xs rounded-md border-gray-300 ${!isActive ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'} dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                                                        >
                                                            <option value="Manual">Input Manual</option>
                                                            <option value="SIAKAD">API SIAKAD (Otomatis)</option>
                                                            <option value="SISTER">SISTER (Cloud)</option>
                                                            <option value="PDDikti">PDDikti (Feeder)</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 border-r dark:border-gray-700">
                                                        <select
                                                            disabled={!isActive}
                                                            value={targetData.evidence_type || ''}
                                                            onChange={(e) => handleRowChange(level.id, 'evidence_type', e.target.value)}
                                                            className={`block w-full sm:text-xs rounded-md border-gray-300 ${!isActive ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'} dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                                                        >
                                                            <option value="File PDF">Unggah File PDF</option>
                                                            <option value="Link Dokumen">Link URL Dokumen</option>
                                                            <option value="Angka Kuantitatif">Angka Capaian Saja</option>
                                                            <option value="Teks Singkat">Teks Singkat</option>
                                                            <option value="Ya/Tidak">Ya / Tidak (Boolean)</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 min-w-[200px]">
                                                        {isActive && (
                                                            <div className="flex flex-col gap-2">
                                                                {/* Map Evidences */}
                                                                {targetData.evidences && targetData.evidences.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {targetData.evidences.map(ev => (
                                                                            <span key={ev.id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                                <FiPaperclip className="mr-1" />
                                                                                {ev.original_name.substring(0, 15) + '...'}
                                                                                <button type="button" onClick={() => setPreviewData({ isOpen: true, url: `/storage/${ev.file_path}`, type: ev.mime_type, name: ev.original_name })} className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                                                                    <FiEye />
                                                                                </button>
                                                                                <button type="button" onClick={() => handleUnlinkEvidence(level.id, targetData.id, ev.id)} className="ml-1 text-red-500 hover:text-red-700">
                                                                                    <FiTrash2 />
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">Belum ada bukti yang dilampirkan.</span>
                                                                )}
                                                                {/* Only show 'Lampirkan' if there is an ID (it has been saved to DB) */}
                                                                {targetData.id ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setEvidenceModalOpen(true); setSelectedTargetId(targetData.id); }}
                                                                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        <FiPaperclip className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                        Lampirkan Bukti
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[10px] text-orange-500 font-medium">Simpan konfigurasi dahulu untuk melampirkan file</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-800/80 px-4 py-4 sm:px-6 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 shadow-inner">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading || saving}
                            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Matriks'}
                        </button>
                    </div>
                </div>
            </div>

            <EvidenceUploaderModal
                isOpen={evidenceModalOpen}
                onClose={() => setEvidenceModalOpen(false)}
                metricTargetId={selectedTargetId}
                onSuccess={fetchData} /* refresh the evidence list */
            />

            <DocumentPreviewer
                isOpen={previewData.isOpen}
                onClose={() => setPreviewData({ ...previewData, isOpen: false })}
                fileUrl={previewData.url}
                fileType={previewData.type}
                fileName={previewData.name}
            />
        </div>
    );
}
