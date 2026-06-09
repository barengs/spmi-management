import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../services/authStore';
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
    const { user } = useAuth();
    const permissions = user?.permissions || [];
    const canReviewEvidence = permissions.includes('audit.score.update');
    const canUploadEvidence = !canReviewEvidence && (permissions.includes('evidence.upload') || permissions.includes('standard.update'));
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
    const [reviewComment, setReviewComment] = useState('');
    const [reviewingAction, setReviewingAction] = useState('');
    const auditLocked = Boolean(borangItem?.audit_locked);

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
            setReviewComment(latestSubmission?.review_status === 'REJECTED' ? (latestSubmission?.review_comment || '') : '');
            setSelectedFile(null);
            setShowFilePicker(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Detail borang gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (action, createPtk = false) => {
        if (!latestSubmission?.id) {
            toast.warning('Belum ada bukti atau tautan yang bisa direview.');
            return;
        }

        if (createPtk && !reviewComment.trim()) {
            toast.warning('Komentar auditor wajib diisi sebelum membuat PTK.');
            return;
        }

        setReviewingAction(createPtk ? 'ptk' : action);

        try {
            const response = await api.patch(`/evidences/${latestSubmission.id}/review`, {
                action,
                comment: reviewComment,
            });

            if (createPtk) {
                const targetCompletionDate = window.prompt('Masukkan target tanggal koreksi untuk auditee (format YYYY-MM-DD):');

                if (!targetCompletionDate || !targetCompletionDate.trim()) {
                    throw new Error('Target tanggal koreksi wajib diisi untuk membuat PTK.');
                }

                await api.post('/ptk', {
                    metric_id: borangItem.metric_id,
                    evidence_id: latestSubmission.id,
                    assigned_unit_id: borangItem.prodi?.id || null,
                    target_completion_date: targetCompletionDate.trim(),
                    finding_summary: reviewComment.trim(),
                });
            }

            toast.success(createPtk ? 'PTK berhasil dibuat dari temuan auditor.' : response.data.message);
            await fetchBorangItem();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Aksi review gagal diproses.');
        } finally {
            setReviewingAction('');
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
                            {canReviewEvidence
                                ? 'Halaman ini menampilkan bukti pelaksanaan secara read-only untuk kebutuhan review auditor.'
                                : 'Halaman ini menampilkan detail satu item borang dan digunakan untuk mengunggah dokumen bukti beserta komentar pendukung.'}
                        </p>
                        {auditLocked && (
                            <div className="mt-3 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                                Audit Locked
                            </div>
                        )}
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

                {auditLocked ? (
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
                        Periode audit sudah ditutup. Bukti, komentar review, dan hasil audit pada item ini sudah terkunci.
                    </div>
                ) : canReviewEvidence ? (
                    <div className="mt-6 space-y-5">
                        {!latestSubmission ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                                Belum ada bukti atau tautan yang diunggah auditee pada item borang ini.
                            </div>
                        ) : (
                            <>
                                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Bukti Terunggah</div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {latestSubmission.source_type === 'file'
                                                    ? (latestSubmission.original_name || latestSubmission.stored_name || 'File bukti')
                                                    : 'Tautan Bukti'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {latestSubmission.source_type === 'file'
                                                    ? `${formatBytes(latestSubmission.size_bytes)}${latestSubmission.mime_type ? ` • ${latestSubmission.mime_type}` : ''}`
                                                    : 'Link dokumen / bukti eksternal'}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {latestSubmission.source_type === 'file' ? (
                                                <button
                                                    type="button"
                                                    onClick={handleViewSavedFile}
                                                    className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                                >
                                                    Lihat File
                                                </button>
                                            ) : latestSubmission.link_url ? (
                                                <a
                                                    href={latestSubmission.link_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                                >
                                                    Buka Link
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Komentar Auditee</div>
                                    <div className="mt-2 text-sm leading-6 text-gray-700">
                                        {latestSubmission.notes || 'Belum ada komentar dari auditee.'}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Komentar Auditor</label>
                                    <textarea
                                        rows="4"
                                        value={reviewComment}
                                        onChange={(event) => setReviewComment(event.target.value)}
                                        className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                        placeholder="Isi komentar auditor. Wajib diisi jika ingin membuat PTK."
                                    />
                                    {latestSubmission.review_comment ? (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Komentar review terakhir: {latestSubmission.review_comment}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleReview('accept')}
                                        disabled={reviewingAction !== ''}
                                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Icon icon={reviewingAction === 'accept' ? Icons.refresh : Icons.check} width={16} className={reviewingAction === 'accept' ? 'animate-spin' : ''} />
                                        Terealisasi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleReview('reject')}
                                        disabled={reviewingAction !== ''}
                                        className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Icon icon={reviewingAction === 'reject' ? Icons.refresh : Icons.close} width={16} className={reviewingAction === 'reject' ? 'animate-spin' : ''} />
                                        Tidak Terealisasi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleReview('reject', true)}
                                        disabled={reviewingAction !== '' || !reviewComment.trim()}
                                        className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Icon icon={reviewingAction === 'ptk' ? Icons.refresh : Icons.add} width={16} className={reviewingAction === 'ptk' ? 'animate-spin' : ''} />
                                        Buat PTK
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : canUploadEvidence ? (
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

            {!canReviewEvidence && borangItem?.metric?.ptks && borangItem.metric.ptks.length > 0 && (
                <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-rose-900">Daftar Temuan Auditor</h2>
                            <p className="mt-1 text-sm text-rose-800">
                                {borangItem.metric.ptks.length} temuan yang perlu ditindaklanjuti
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {borangItem.metric.ptks.map((ptk, index) => (
                            <div key={ptk.id} className="rounded-2xl border border-rose-300 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                            Temuan #{index + 1}
                                        </div>
                                        <div className="mt-3 text-sm font-semibold text-gray-900">Komentar Auditor</div>
                                        <div className="mt-2 text-sm leading-6 text-gray-700">
                                            {ptk.finding_summary || '-'}
                                        </div>
                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-lg bg-gray-50 p-3">
                                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Status</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    {ptk.status === 'OPEN' ? '🔴 Terbuka' : ptk.status === 'RESPONDED' ? '🟡 Sudah Direspons' : ptk.status === 'VERIFIED' ? '🟢 Terverifikasi' : '✓ Selesai'}
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 p-3">
                                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Target Selesai</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                                    {ptk.target_completion_date ? new Date(ptk.target_completion_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        {ptk.response_note && (
                                            <div className="mt-3 rounded-lg bg-blue-50 p-3">
                                                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Respons Auditee</div>
                                                <div className="mt-1 text-sm text-blue-900">{ptk.response_note}</div>
                                            </div>
                                        )}
                                        {ptk.verified_at && (
                                            <div className="mt-3 text-xs text-gray-500">
                                                ✓ Diverifikasi pada {new Date(ptk.verified_at).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        )}
                                        {ptk.closed_at && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                ✓ Ditutup pada {new Date(ptk.closed_at).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
}
