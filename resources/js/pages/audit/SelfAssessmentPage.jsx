import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiClock, FiAlertCircle, FiChevronRight, FiChevronDown, FiEdit3 } from 'react-icons/fi';
import api from '../../services/api';
import EvaluationFormModal from '../../components/SelfAssessment/EvaluationFormModal';

export default function SelfAssessmentPage() {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [expandedStandards, setExpandedStandards] = useState({});

    const fetchTargets = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/self-assessments/targets');
            setTargets(data); // data is grouped: [{ standard: {}, targets: [] }]

            // Expand all by default
            const initialExpanded = {};
            data.forEach(group => {
                initialExpanded[group.standard.id] = true;
            });
            setExpandedStandards(initialExpanded);
        } catch (error) {
            console.error("Error fetching self assessments:", error);
            toast.error('Gagal memuat data evaluasi diri.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, []);

    const toggleStandard = (id) => {
        setExpandedStandards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleOpenForm = (target) => {
        setSelectedTarget(target);
        setIsFormOpen(true);
    };

    const StatusBadge = ({ selfAssessments }) => {
        const assessment = selfAssessments && selfAssessments.length > 0 ? selfAssessments[0] : null;

        if (!assessment) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    <FiAlertCircle className="mr-1" /> Belum Diisi
                </span>
            );
        }

        if (assessment.status === 'DRAFT') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50">
                    <FiClock className="mr-1" /> Draft Disimpan
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/50">
                <FiCheckCircle className="mr-1" /> Selesai
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evaluasi Diri (Self-Assessment)</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        Isi form ketercapaian target mutu untuk unit kerja Anda dan lampirkan bukti fisik sebagai persiapan sebelum Audit Mutu Internal.
                    </p>
                </div>
            </div>

            {targets.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Tidak Ada Target</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unit Anda belum ditugaskan untuk target mutu apapun pada periode ini.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {targets.map((group) => (
                        <div key={group.standard.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Standard Header Row */}
                            <div
                                className="px-4 py-4 sm:px-6 cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-between"
                                onClick={() => toggleStandard(group.standard.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="text-gray-400">
                                        {expandedStandards[group.standard.id] ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                            {group.standard.name}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-xs text-gray-500 dark:text-gray-400">
                                            Kategori: {group.standard.category} | Periode: {group.standard.periode_tahun}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-gray-500 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md px-3 py-1">
                                    {group.targets.length} Indikator target
                                </div>
                            </div>

                            {/* Targets Details List */}
                            {expandedStandards[group.standard.id] && (
                                <div className="border-t border-gray-200 dark:border-gray-700">
                                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {group.targets.map((target) => (
                                            <li key={target.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                                                                {target.metric?.content || 'Pernyataan Indikator'}
                                                            </p>
                                                            <StatusBadge selfAssessments={target.selfAssessments} />
                                                        </div>
                                                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-6">
                                                            <div>
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Target:</span> {target.target_value} {target.measure_unit}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Dokumen:</span> {target.evidence_type}
                                                            </div>
                                                            {target.selfAssessments && target.selfAssessments.length > 0 && target.selfAssessments[0].claimed_score !== null && (
                                                                <div className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                                                    <span className="font-semibold text-blue-700 dark:text-blue-300">Klaim Skor:</span>
                                                                    <span className="ml-1 text-blue-900 dark:text-blue-100 font-bold">{target.selfAssessments[0].claimed_score} / 4.00</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleOpenForm(target)}
                                                            className="inline-flex items-center px-3 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 dark:bg-transparent dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            <FiEdit3 className="mr-2 -ml-1 h-4 w-4" />
                                                            Isi Evaluasi
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && selectedTarget && (
                <EvaluationFormModal
                    isOpen={isFormOpen}
                    onClose={() => { setIsFormOpen(false); setSelectedTarget(null); }}
                    target={selectedTarget}
                    onSuccess={fetchTargets}
                />
            )}
        </div>
    );
}
