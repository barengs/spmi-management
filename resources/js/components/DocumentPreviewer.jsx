import React from 'react';
import { FiX, FiDownload } from 'react-icons/fi';

export default function DocumentPreviewer({ isOpen, onClose, fileUrl, fileType, fileName }) {
    if (!isOpen || !fileUrl) return null;

    const isPdf = fileType === 'application/pdf' || fileUrl.endsWith('.pdf');
    const isOffice = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileType) || fileUrl.match(/\.(doc|docx|xls|xlsx)$/i);

    // For localhost/intranet, Office Online Viewer won't work perfectly unless port forwarded via ngrok/localtunnel
    // But this is the standard practice for public production apps.
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-center justify-center bg-black/80 dark:bg-black/90 p-4 transition-opacity">
            <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-600 dark:text-blue-400">
                            {isPdf ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate w-64 md:w-96" title={fileName}>
                            {fileName || "Pratinjau Dokumen"}
                        </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50"
                        >
                            <FiDownload className="mr-1.5" /> Unduh
                        </a>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-950 w-full h-full relative">
                    {isPdf && (
                        <iframe
                            src={`${fileUrl}#view=FitH`}
                            className="w-full h-full border-0"
                            title="PDF Preview"
                        />
                    )}

                    {isOffice && (
                        <iframe
                            src={officeViewerUrl}
                            className="w-full h-full border-0"
                            title="Office Preview"
                        />
                    )}

                    {!isPdf && !isOffice && (
                        <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center px-4">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Pratinjau Tidak Tersedia</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Format file ini tidak didukung untuk pratinjau langsung di dalam browser. Silakan unduh file untuk melihat isinya secara lokal.
                            </p>
                            <a
                                href={fileUrl}
                                download
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                            >
                                <FiDownload className="mr-2" /> Unduh File ({fileType?.split('/')[1]?.toUpperCase() || 'ZIP'})
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
