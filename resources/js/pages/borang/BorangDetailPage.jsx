import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

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

function FieldCard({ label, value, hint }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{value || '-'}</div>
            {hint ? <div className="mt-1 text-xs leading-5 text-gray-500">{hint}</div> : null}
        </div>
    );
}

export default function BorangDetailPage() {
    const navigate = useNavigate();
    const { borangItemId } = useParams();
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const canUploadEvidence = permissions.includes('evidence.upload') || permissions.includes('standard.update');
    const [loading, setLoading] = useState(true);
    const [borangItem, setBorangItem] = useState(null);
    const [uploadMode, setUploadMode] = useState('file');
    const [selectedFile, setSelectedFile] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [latestSubmission, setLatestSubmission] = useState(null);
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);

    const fetchBorangItem = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/borang/items/${borangItemId}`);
            const item = response.data.data;
            const latestSubmission = item?.latest_submission || null;

            setBorangItem(item);
            setNotes(latestSubmission?.notes || '');
            setLinkUrl(latestSubmission?.link_url || '');
            setLatestSubmission(latestSubmission);
            setUploadMode(latestSubmission?.source_type === 'link' ? 'link' : 'file');
            setSelectedFile(null);
            setShowFilePicker(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Detail borang gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBorangItem();
    }, [borangItemId]);

    const resetForm = () => {
        setUploadMode('file');
        setSelectedFile(null);
        setLinkUrl('');
        setNotes('');
        setLatestSubmission(null);
        setShowFilePicker(false);
    };

    const handleViewSavedFile = async () => {
        if (!latestSubmission?.id || latestSubmission?.source_type !== 'file') {
            return;
        }

        try {
            const response = await api.get(`/evidences/${latestSubmission.id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(response.data);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (error) {
            toast.error('File bukti gagal dibuka.');
        }
    };

    const handleRemoveSavedFile = async () => {
        if (!latestSubmission?.id || latestSubmission?.source_type !== 'file') {
            return;
        }

        if (!window.confirm('Hapus file bukti yang sudah diunggah?')) {
            return;
        }

        try {
            setRemoving(true);
            await api.delete(`/evidences/${latestSubmission.id}`);
            toast.success('File bukti berhasil dihapus.');
            await fetchBorangItem();
        } catch (error) {
            toast.error(error.response?.data?.message || 'File bukti gagal dihapus.');
        } finally {
            setRemoving(false);
        }
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!borangItem?.metric_id) {
            toast.error('Indikator borang tidak ditemukan.');
            return;
        }

        if (!notes.trim() && uploadMode === 'file' && !selectedFile) {
            toast.warning('Isi komentar/catatan atau pilih file bukti terlebih dahulu.');
            return;
        }

        if (!notes.trim() && uploadMode === 'link' && !linkUrl.trim()) {
            toast.warning('Isi komentar/catatan atau masukkan tautan bukti terlebih dahulu.');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('source_type', uploadMode);
            formData.append('notes', notes);

            if (uploadMode === 'file' && selectedFile) {
                formData.append('file', selectedFile);
            }

            if (uploadMode === 'link' && linkUrl.trim()) {
                formData.append('link_url', linkUrl);
            }

            await api.post(`/borang/items/${borangItem.id}/evidences`, formData);
            toast.success('Bukti borang berhasil disimpan.');
            resetForm();
            navigate('/borang');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bukti borang gagal diunggah.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-sm text-gray-500">Memuat detail borang...</div>;
    }

    if (!borangItem) {
        return <div className="p-8 text-sm text-gray-500">Detail borang tidak ditemukan.</div>;
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                            <Icon icon={Icons.document} width={14} />
                            Detail Borang
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{borangItem.standard_name}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Halaman ini menampilkan detail satu item borang dan digunakan untuk mengunggah dokumen bukti beserta komentar pendukung.
                        </p>
                    </div>

                    <Link
                        to="/borang"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                        <Icon icon={Icons.back} width={16} />
                        Kembali ke Borang
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <FieldCard label="Standar Mutu" value={borangItem.standard_name} />
                <FieldCard label="IKU" value={borangItem.iku} />
                <FieldCard label="IKT" value={borangItem.ikt} />
                <FieldCard label="Sasaran Mutu" value={borangItem.sasaran_mutu} />
                <FieldCard label="Indikator" value={borangItem.indikator} />
                <FieldCard label="Target Sasaran" value={borangItem.target_sasaran} />
                <FieldCard label="PJ" value={borangItem.pj} />
                <FieldCard label="Prodi" value={borangItem.prodi?.name || '-'} hint={borangItem.prodi?.code || null} />
                <FieldCard label="Fakultas" value={borangItem.faculty?.name || '-'} hint={borangItem.faculty?.code || null} />
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Upload Bukti</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            File bersifat opsional. Anda dapat mengirim komentar/catatan saja, atau melengkapinya dengan file maupun tautan dokumen.
                        </p>
                    </div>
                </div>

                {canUploadEvidence ? (
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

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Komentar / Catatan</label>
                            <textarea
                                rows="3"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                placeholder="Tuliskan komentar penjelas untuk dokumen bukti ini"
                            />
                        </div>

                        {uploadMode === 'file' ? (
                            latestSubmission?.source_type === 'file' && !selectedFile && !showFilePicker ? (
                                <div className="rounded-3xl border border-sky-200 bg-sky-50 px-6 py-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <div className="text-sm font-semibold text-sky-900">
                                                {latestSubmission.original_name || latestSubmission.stored_name || 'File bukti tersimpan'}
                                            </div>
                                            <div className="mt-1 text-xs text-sky-700">
                                                {formatBytes(latestSubmission.size_bytes)}{latestSubmission.mime_type ? ` • ${latestSubmission.mime_type}` : ''}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={handleViewSavedFile}
                                                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowFilePicker(true)}
                                                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                                            >
                                                Change / Re-upload
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveSavedFile}
                                                disabled={removing}
                                                className="rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                                <Icon icon={Icons.execution} width={28} className="mx-auto text-sky-600" />
                                <div className="mt-4 text-sm font-medium text-gray-800">Pilih file bukti untuk item borang ini</div>
                                <div className="mt-1 text-xs text-gray-500">PDF, DOCX, XLSX maksimal 20MB</div>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={(event) => {
                                        const nextFile = event.target.files?.[0] || null;
                                        setSelectedFile(nextFile);
                                        setShowFilePicker(true);
                                    }}
                                    className="mx-auto mt-4 block text-sm text-gray-600"
                                />
                                {selectedFile && (
                                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                                        File terpilih: <span className="font-medium">{selectedFile.name}</span>
                                    </div>
                                )}
                                {!selectedFile && latestSubmission?.source_type === 'file' && (
                                    <div className="mt-4 text-xs text-gray-500">
                                        Mengunggah file baru akan menggantikan file tersimpan sebelumnya.
                                    </div>
                                )}
                            </div>
                            )
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
                                {latestSubmission?.source_type === 'file' && latestSubmission?.original_name && !linkUrl.trim() && (
                                    <div className="mt-3 text-xs text-gray-500">
                                        Bukti terakhir disimpan sebagai file: {latestSubmission.original_name}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={uploading ? Icons.refresh : Icons.save} width={16} className={uploading ? 'animate-spin' : ''} />
                                Simpan Bukti
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                        Anda belum memiliki hak untuk mengunggah bukti pada item borang ini.
                    </div>
                )}
            </section>

        </div>
    );
}
