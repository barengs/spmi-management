import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

function flattenIndicators(nodes, carry = []) {
    nodes.forEach((node) => {
        if (node.type === 'Indicator') {
            carry.push(node);
        }

        if (node.children_recursive?.length) {
            flattenIndicators(node.children_recursive, carry);
        }
    });

    return carry;
}

function formatBytes(bytes) {
    if (!bytes) {
        return '-';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExecutionRepositoryPage() {
    const [standards, setStandards] = useState([]);
    const [selectedStandardId, setSelectedStandardId] = useState('');
    const [indicators, setIndicators] = useState([]);
    const [selectedIndicator, setSelectedIndicator] = useState(null);
    const [evidences, setEvidences] = useState([]);
    const [uploadMode, setUploadMode] = useState('file');
    const [selectedFile, setSelectedFile] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewType, setPreviewType] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        const fetchStandards = async () => {
            try {
                const response = await api.get('/standards');
                const activeStandards = response.data.data || [];
                setStandards(activeStandards);

                if (activeStandards.length > 0) {
                    setSelectedStandardId(String(activeStandards[0].id));
                }
            } catch (error) {
                toast.error('Daftar standar gagal dimuat.');
            }
        };

        fetchStandards();
    }, []);

    useEffect(() => {
        if (!selectedStandardId) {
            return;
        }

        const fetchIndicators = async () => {
            try {
                const response = await api.get(`/standards/${selectedStandardId}/metrics/tree`);
                const nextIndicators = flattenIndicators(response.data.data || []);
                setIndicators(nextIndicators);
                setSelectedIndicator(nextIndicators[0] || null);
            } catch (error) {
                toast.error('Daftar indikator gagal dimuat.');
            }
        };

        fetchIndicators();
    }, [selectedStandardId]);

    useEffect(() => {
        if (!selectedIndicator) {
            setEvidences([]);
            return;
        }

        const fetchEvidences = async () => {
            try {
                const response = await api.get(`/metrics/${selectedIndicator.id}/evidences`);
                setEvidences(response.data.data || []);
            } catch (error) {
                toast.error('Repository bukti gagal dimuat.');
            }
        };

        fetchEvidences();
    }, [selectedIndicator]);

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const resetForm = () => {
        setSelectedFile(null);
        setLinkUrl('');
        setTitle('');
        setNotes('');
        setUploadMode('file');
    };

    const refreshEvidenceList = async () => {
        if (!selectedIndicator) {
            return;
        }

        const response = await api.get(`/metrics/${selectedIndicator.id}/evidences`);
        setEvidences(response.data.data || []);
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!selectedIndicator) {
            toast.warning('Pilih indikator terlebih dahulu.');
            return;
        }

        if (uploadMode === 'file' && !selectedFile) {
            toast.warning('Pilih file bukti terlebih dahulu.');
            return;
        }

        if (uploadMode === 'link' && !linkUrl.trim()) {
            toast.warning('Masukkan tautan bukti terlebih dahulu.');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('source_type', uploadMode);
            formData.append('title', title);
            formData.append('notes', notes);

            if (uploadMode === 'file') {
                formData.append('file', selectedFile);
            } else {
                formData.append('link_url', linkUrl);
            }

            await api.post(`/metrics/${selectedIndicator.id}/evidences`, formData);
            toast.success('Bukti berhasil ditambahkan.');
            await refreshEvidenceList();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bukti gagal diunggah.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (evidence) => {
        if (!window.confirm(`Hapus bukti "${evidence.title || evidence.original_name}"?`)) {
            return;
        }

        try {
            await api.delete(`/evidences/${evidence.id}`);
            toast.success('Bukti berhasil dihapus.');
            await refreshEvidenceList();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bukti gagal dihapus.');
        }
    };

    const handlePreview = async (evidence) => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewTitle(evidence.title || evidence.original_name || 'Preview Bukti');
        setPreviewUrl('');
        setPreviewType(evidence.source_type);

        if (evidence.source_type === 'link') {
            setPreviewUrl(evidence.link_url);
            return;
        }

        if (!evidence.is_previewable) {
            toast.info('File ini belum mendukung preview inline. Gunakan unduh file.');
            return;
        }

        setPreviewLoading(true);

        try {
            const response = await api.get(`/evidences/${evidence.id}/download`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            setPreviewUrl(url);
            setPreviewType('pdf');
        } catch (error) {
            toast.error('Preview file gagal dimuat.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleDownload = async (evidence) => {
        try {
            const response = await api.get(`/evidences/${evidence.id}/download`, {
                responseType: 'blob',
            });

            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = evidence.original_name || evidence.stored_name || 'bukti';
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('File gagal diunduh.');
        }
    };

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    <Icon icon={Icons.execution} width={14} />
                    Sprint 6
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Repository Bukti</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Kelola bukti indikator dengan upload file, tautan dokumen, dan preview PDF langsung di browser.
                </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Standar
                        </label>
                        <select
                            value={selectedStandardId}
                            onChange={(event) => setSelectedStandardId(event.target.value)}
                            className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                            {standards.map((standard) => (
                                <option key={standard.id} value={standard.id}>
                                    {standard.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Indikator
                        </div>
                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                            {indicators.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                                    Belum ada indikator pada standar ini.
                                </div>
                            )}
                            {indicators.map((indicator) => (
                                <button
                                    key={indicator.id}
                                    type="button"
                                    onClick={() => setSelectedIndicator(indicator)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                        selectedIndicator?.id === indicator.id
                                            ? 'border-sky-400 bg-sky-50'
                                            : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'
                                    }`}
                                >
                                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                                        <Icon icon={Icons.target} width={14} />
                                        Indicator #{indicator.id}
                                    </div>
                                    <div className="text-sm font-medium leading-6 text-gray-900">{indicator.content}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <section className="space-y-6">
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Indikator terpilih</div>
                                <h2 className="mt-2 text-lg font-semibold text-gray-900">
                                    {selectedIndicator?.content || 'Pilih indikator'}
                                </h2>
                            </div>
                        </div>

                        <form onSubmit={handleUpload} className="mt-6 space-y-5">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('file')}
                                    className={`rounded-full px-4 py-2 text-sm font-medium ${uploadMode === 'file' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    File Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('link')}
                                    className={`rounded-full px-4 py-2 text-sm font-medium ${uploadMode === 'link' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Link Dokumen
                                </button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Judul Bukti</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                        placeholder="Contoh: SK Kurikulum 2026"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Catatan</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>

                            {uploadMode === 'file' ? (
                                <div
                                    onDragEnter={() => setDragActive(true)}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragActive(false);
                                        const droppedFile = event.dataTransfer.files?.[0];
                                        if (droppedFile) {
                                            setSelectedFile(droppedFile);
                                        }
                                    }}
                                    className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                                        dragActive ? 'border-sky-500 bg-sky-50' : 'border-gray-300 bg-gray-50'
                                    }`}
                                >
                                    <Icon icon={Icons.execution} width={28} className="mx-auto text-sky-600" />
                                    <div className="mt-4 text-sm font-medium text-gray-800">Drag & drop file bukti di sini</div>
                                    <div className="mt-1 text-xs text-gray-500">PDF, DOCX, XLSX maksimal 20MB</div>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                        className="mx-auto mt-4 block text-sm text-gray-600"
                                    />
                                    {selectedFile && (
                                        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                                            File terpilih: <span className="font-medium">{selectedFile.name}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Tautan Dokumen</label>
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={(event) => setLinkUrl(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                        placeholder="https://..."
                                    />
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedIndicator}
                                    className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Icon icon={uploading ? Icons.refresh : Icons.save} width={16} className={uploading ? 'animate-spin' : ''} />
                                    Simpan Bukti
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold text-gray-900">Daftar Bukti</h3>
                            <div className="text-sm text-gray-500">{evidences.length} item</div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {evidences.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                                    Belum ada bukti untuk indikator ini.
                                </div>
                            )}

                            {evidences.map((evidence) => (
                                <div key={evidence.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {evidence.title || evidence.original_name || evidence.link_url}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {evidence.source_type === 'file'
                                                    ? `${evidence.original_name} • ${formatBytes(evidence.size_bytes)}`
                                                    : evidence.link_url}
                                            </div>
                                            {evidence.notes && (
                                                <div className="mt-2 text-sm text-gray-600">{evidence.notes}</div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handlePreview(evidence)}
                                                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                                            >
                                                Preview
                                            </button>
                                            {evidence.source_type === 'file' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(evidence)}
                                                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                                >
                                                    Unduh
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(evidence)}
                                                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {(previewUrl || previewLoading) && (
                <div className="fixed inset-0 z-50 bg-black/70 p-4">
                    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Preview</div>
                                <div className="text-sm font-semibold text-gray-900">{previewTitle}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (previewUrl && previewUrl.startsWith('blob:')) {
                                        URL.revokeObjectURL(previewUrl);
                                    }
                                    setPreviewUrl('');
                                    setPreviewType('');
                                    setPreviewTitle('');
                                }}
                                className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.close} width={18} />
                            </button>
                        </div>

                        <div className="flex-1 bg-gray-100">
                            {previewLoading ? (
                                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                    Memuat preview...
                                </div>
                            ) : previewType === 'link' ? (
                                <iframe title={previewTitle} src={previewUrl} className="h-full w-full" />
                            ) : previewUrl ? (
                                <iframe title={previewTitle} src={previewUrl} className="h-full w-full" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                    Preview tidak tersedia untuk file ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
