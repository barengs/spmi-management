import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FiUploadCloud, FiFile, FiCheckCircle, FiSearch } from 'react-icons/fi';

export default function EvidenceUploaderModal({ isOpen, onClose, metricTargetId, selfAssessmentId, isRplSupport, onSuccess }) {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'repository'
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isRpl, setIsRpl] = useState(false);

    // Repository States
    const [repoFiles, setRepoFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingRepo, setLoadingRepo] = useState(false);
    const [linking, setLinking] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsRpl(false); // Reset Rpl state on open
            if (activeTab === 'repository') fetchRepository();
        }
    }, [isOpen, activeTab]);

    const fetchRepository = async () => {
        setLoadingRepo(true);
        try {
            const res = await api.get('/evidences', { params: { search: searchQuery } });
            setRepoFiles(res.data.data || []);
        } catch (err) {
            toast.error('Gagal mengambil daftar dokumen');
        } finally {
            setLoadingRepo(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const executeLink = async (evidenceId) => {
        if (selfAssessmentId) {
            await api.post('/self-assessments/link-evidence', {
                evidence_id: evidenceId,
                self_assessment_id: selfAssessmentId,
                is_rpl: isRpl ? 1 : 0
            });
        } else {
            await api.post('/evidences/link', {
                evidence_id: evidenceId,
                metric_target_id: metricTargetId
            });
        }
    };

    const handleFileUpload = async (file) => {
        // Validate MIME
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Format file tidak didukung. Harap unggah PDF, DOCX, atau XLSX.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 20MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload File
            const uploadRes = await api.post('/evidences', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const evidenceId = uploadRes.data.data.id;

            // 2. Link File
            await executeLink(evidenceId);

            toast.success('Bukti berhasil diunggah dan ditautkan');
            onSuccess();
            onClose();
            setActiveTab('upload');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Terjadi kesalahan saat mengunggah');
        } finally {
            setUploading(false);
        }
    };

    const handleLinkExisting = async (evidenceId) => {
        setLinking(true);
        try {
            await executeLink(evidenceId);
            toast.success('Bukti dari repository berhasil ditautkan');
            onSuccess();
            onClose();
        } catch (err) {
            // Check if it's dupicate linking error
            if (err.response?.status === 500 && err.response?.data?.message?.includes('Duplicate')) {
                toast.error('Dokumen ini sudah tertaut pada target ini.');
            } else {
                toast.error(err.response?.data?.message || 'Gagal menautkan dokumen');
            }
        } finally {
            setLinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full dark:bg-gray-800 border dark:border-gray-700">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                Lampirkan Bukti (Evidence)
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Tutup</span>
                                &times;
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'upload' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                            >
                                Unggah Baru
                            </button>
                            <button
                                onClick={() => setActiveTab('repository')}
                                className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'repository' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                            >
                                Pilih dari Repository
                            </button>
                        </div>

                        {activeTab === 'upload' && (
                            <div
                                className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="space-y-1 text-center">
                                    <FiUploadCloud className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:bg-gray-800 dark:text-blue-400">
                                            <span>Pilih file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={uploading} />
                                        </label>
                                        <p className="pl-1">atau seret dan lepas di sini</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        PDF, DOCX, XLSX hingga 20MB
                                    </p>

                                    {isRplSupport && (
                                        <div className="mt-4 flex items-center justify-center">
                                            <div className="flex items-center">
                                                <input
                                                    id="is_rpl"
                                                    name="is_rpl"
                                                    type="checkbox"
                                                    checked={isRpl}
                                                    onChange={(e) => setIsRpl(e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <label htmlFor="is_rpl" className="ml-2 block text-sm text-gray-900 dark:text-white font-medium">
                                                    Tandai sebagai Bukti Rekognisi Pembelajaran Lampau (RPL)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {uploading && (
                                        <p className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                                            Sedang mengunggah... mohon tunggu
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'repository' && (
                            <div>
                                <div className="mb-4 flex">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="Cari nama dokumen..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchRepository()}
                                        />
                                    </div>
                                    <button
                                        onClick={fetchRepository}
                                        className="ml-3 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Cari
                                    </button>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                                    {loadingRepo ? (
                                        <div className="text-center py-10">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                                        </div>
                                    ) : repoFiles.length > 0 ? (
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {repoFiles.map(file => (
                                                <li key={file.id} className="p-4 hover:bg-white dark:hover:bg-gray-800 flex items-center justify-between transition-colors">
                                                    <div className="flex items-center">
                                                        <FiFile className="h-6 w-6 text-gray-400 mr-3" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{file.original_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLinkExisting(file.id)}
                                                        disabled={linking}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                                    >
                                                        Tautkan
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                            <p>Tidak ada dokumen ditemukan di repository.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse dark:bg-gray-700/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
