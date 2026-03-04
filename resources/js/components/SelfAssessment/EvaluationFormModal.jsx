import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiPaperclip, FiTrash2, FiEye, FiCheckSquare } from 'react-icons/fi';
import api from '../../services/api';
import { toast } from 'react-toastify';
import EvidenceUploaderModal from '../EvidenceUploaderModal';
import DocumentPreviewer from '../DocumentPreviewer';

export default function EvaluationFormModal({ isOpen, onClose, target, onSuccess }) {
    const [claimedScore, setClaimedScore] = useState('');
    const [successAnalysis, setSuccessAnalysis] = useState('');
    const [failureAnalysis, setFailureAnalysis] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [saving, setSaving] = useState(false);

    // Evidences are inside target.selfAssessments[0]
    const [evidences, setEvidences] = useState([]);
    const [assessmentId, setAssessmentId] = useState(null);

    const [uploaderOpen, setUploaderOpen] = useState(false);
    const [previewData, setPreviewData] = useState({ isOpen: false, url: '', type: '', name: '' });

    useEffect(() => {
        if (isOpen && target) {
            const assessment = target.selfAssessments && target.selfAssessments.length > 0 ? target.selfAssessments[0] : null;
            if (assessment) {
                setAssessmentId(assessment.id);
                setClaimedScore(assessment.claimed_score || '');
                setSuccessAnalysis(assessment.success_analysis || '');
                setFailureAnalysis(assessment.failure_analysis || '');
                setStatus(assessment.status || 'DRAFT');
                setEvidences(assessment.evidences || []);
            } else {
                setAssessmentId(null);
                setClaimedScore('');
                setSuccessAnalysis('');
                setFailureAnalysis('');
                setStatus('DRAFT');
                setEvidences([]);
            }
        }
    }, [isOpen, target]);

    const handleSave = async (submitStatus = 'DRAFT') => {
        try {
            setSaving(true);
            const payload = {
                metric_target_id: target.id,
                claimed_score: claimedScore || null,
                success_analysis: successAnalysis,
                failure_analysis: failureAnalysis,
                status: submitStatus
            };

            const { data } = await api.post('/self-assessments/save', payload);
            toast.success(`Evaluasi Diri berhasil disimpan (${submitStatus}).`);

            setAssessmentId(data.data.id);
            setStatus(submitStatus);

            if (onSuccess) onSuccess();
            if (submitStatus === 'SUBMITTED') {
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan evaluasi diri.');
        } finally {
            setSaving(false);
        }
    };

    const handleUnlinkEvidence = async (evidenceId) => {
        if (!assessmentId) return;
        if (!window.confirm('Lepas tautan berkas ini dari evaluasi Anda?')) return;

        try {
            await api.delete('/self-assessments/unlink-evidence', {
                data: {
                    self_assessment_id: assessmentId,
                    evidence_id: evidenceId
                }
            });
            toast.success('Tautan berhasil dilepas.');

            // local state update for fast UX
            setEvidences(prev => prev.filter(e => e.id !== evidenceId));
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal melepas tautan.');
        }
    };

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                Form Evaluasi Diri
                            </h3>
                            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Tutup</span>
                                <FiX className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-sm font-semibold text-blue-800 dark:text-blue-300">Target Indikator:</div>
                            <p className="mt-1 text-sm text-blue-900 dark:text-blue-200">
                                {target.metric?.content}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                                <div><span className="font-semibold text-blue-700 dark:text-blue-400">Target:</span> {target.target_value} {target.measure_unit}</div>
                                <div><span className="font-semibold text-blue-700 dark:text-blue-400">Tipe Bukti Bawaan:</span> {target.evidence_type}</div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-5 sm:p-6 space-y-5 bg-gray-50 dark:bg-gray-900 overflow-y-auto max-h-[60vh]">
                        {/* Klaim Skor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Klaim Skor (Skala 0.00 - 4.00)
                            </label>
                            <input
                                type="number"
                                min="0" max="4" step="0.01"
                                value={claimedScore}
                                onChange={(e) => setClaimedScore(e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-1/3 sm:text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                placeholder="Contoh: 3.50"
                            />
                        </div>

                        {/* Analisis Keberhasilan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Analisis Pencapaian / Keberhasilan
                            </label>
                            <textarea
                                rows={3}
                                value={successAnalysis}
                                onChange={(e) => setSuccessAnalysis(e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white p-2"
                                placeholder="Jelaskan uraian keberhasilan yang telah dicapai..."
                            />
                        </div>

                        {/* Analisis Kegagalan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Analisis Akar Masalah (Bila Belum Tercapai)
                            </label>
                            <textarea
                                rows={3}
                                value={failureAnalysis}
                                onChange={(e) => setFailureAnalysis(e.target.value)}
                                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white p-2"
                                placeholder="Jelaskan kendala atau uraian bila target belum tercapai..."
                            />
                        </div>

                        {/* Evidences / Lampiran */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Lampiran Bukti Auditee</h4>

                            {assessmentId ? (
                                <>
                                    {evidences && evidences.length > 0 ? (
                                        <div className="flex flex-col gap-2 mb-4">
                                            {evidences.map(ev => (
                                                <div key={ev.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                    <div className="flex items-center min-w-0 space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                                <FiPaperclip />
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {ev.original_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">{(ev.size / 1024).toFixed(1)} KB</span>
                                                                {ev.pivot?.is_rpl === 1 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                                        <FiCheckSquare className="mr-0.5" /> Bukti RPL
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button type="button" onClick={() => setPreviewData({ isOpen: true, url: `/storage/${ev.file_path}`, type: ev.mime_type, name: ev.original_name })} className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:bg-gray-700">
                                                            <FiEye className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleUnlinkEvidence(ev.id)} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded dark:hover:bg-gray-700">
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-4">
                                            Belum ada bukti dilampirkan.
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setUploaderOpen(true)}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        <FiPaperclip className="-ml-1 mr-2 h-4 w-4" />
                                        Unggah / Tautkan Bukti
                                    </button>
                                </>
                            ) : (
                                <div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                                    Simpan draft evaluasi diri ini terlebih dahulu untuk dapat mengunggah dan melampirkan file bukti capaian Prodi.
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700 gap-2">
                        <button
                            type="button"
                            disabled={saving}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:space-x-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            onClick={() => handleSave('SUBMITTED')}
                        >
                            <FiCheckSquare className="mr-2" size={18} /> {saving ? 'Memproses...' : 'Simpan & Finalisasi'}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={() => handleSave('DRAFT')}
                        >
                            <FiSave className="mr-2" size={18} /> Simpan Draft
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>

            {/* Rekognisi Modal Integrasi dengan RPL mode */}
            {uploaderOpen && (
                <EvidenceUploaderModal
                    isOpen={uploaderOpen}
                    onClose={() => setUploaderOpen(false)}
                    // Kita oper parameter assessment ID bukan target ID ke Uploader Modalnya
                    // Wait! EvidenceUploaderModal aslinya didesain nerima metricTargetId.
                    // Kita butuh adaptasi sedikit formnya. Saya oper khusus properti `selfAssessmentId`
                    selfAssessmentId={assessmentId}
                    isRplSupport={true}
                    onSuccess={() => { // manual pull
                        setUploaderOpen(false);
                        if (onSuccess) onSuccess();
                    }}
                />
            )}

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
