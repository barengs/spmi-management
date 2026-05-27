import React, { useEffect, useMemo, useState } from 'react';
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

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function PelaksanaanPage() {
    const user = useSelector((state) => state.auth.user);
    const roleNames = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);
    const hasRole = (roleName) => roleNames.includes(roleName);
    const canModify = hasRole('SuperAdmin') || hasRole('Auditee');

    const [loadingMeta, setLoadingMeta] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingEvidenceId, setDeletingEvidenceId] = useState(null);
    const [prodis, setProdis] = useState([]);
    const [selectedProdiId, setSelectedProdiId] = useState('');
    const [rows, setRows] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [search, setSearch] = useState('');
    const [uploadMode, setUploadMode] = useState('file');
    const [uploadLink, setUploadLink] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNotes, setUploadNotes] = useState('');

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                setLoadingMeta(true);
                const response = await api.get('/pelaksanaan/prodis');
                const nextProdis = response.data.data?.prodis || [];
                setProdis(nextProdis);
                setSelectedProdiId(nextProdis[0] ? String(nextProdis[0].id) : '');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Daftar prodi pelaksanaan gagal dimuat.');
            } finally {
                setLoadingMeta(false);
            }
        };

        fetchMeta();
    }, []);

    useEffect(() => {
        if (!selectedProdiId) {
            setRows([]);
            setSelectedItemId(null);
            return;
        }

        const fetchRows = async () => {
            try {
                setLoadingRows(true);
                const response = await api.get(`/pelaksanaan/prodis/${selectedProdiId}`);
                const nextRows = response.data.data?.rows || [];
                setRows(nextRows);
                setSelectedItemId((current) => (
                    current && nextRows.some((row) => String(row.id) === String(current))
                        ? current
                        : nextRows[0]?.id || null
                ));
            } catch (error) {
                toast.error(error.response?.data?.message || 'Daftar indikator pelaksanaan gagal dimuat.');
            } finally {
                setLoadingRows(false);
            }
        };

        fetchRows();
    }, [selectedProdiId]);

    useEffect(() => {
        if (!selectedItemId) {
            setDetail(null);
            return;
        }

        const fetchDetail = async () => {
            try {
                setLoadingDetail(true);
                const response = await api.get(`/pelaksanaan/items/${selectedItemId}`);
                setDetail(response.data.data || null);
                setUploadMode('file');
                setUploadLink('');
                setUploadFile(null);
                setUploadNotes('');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Detail indikator pelaksanaan gagal dimuat.');
            } finally {
                setLoadingDetail(false);
            }
        };

        fetchDetail();
    }, [selectedItemId]);

    const filteredRows = useMemo(() => (
        rows.filter((row) => (
            `${row.standard_name} ${row.indikator} ${row.sasaran_mutu}`.toLowerCase().includes(search.trim().toLowerCase())
        ))
    ), [rows, search]);

    const selectedProdi = prodis.find((item) => String(item.id) === String(selectedProdiId));

    const refreshDetail = async (itemId = selectedItemId) => {
        if (!itemId) {
            return;
        }

        const response = await api.get(`/pelaksanaan/items/${itemId}`);
        setDetail(response.data.data || null);
    };

    const refreshRows = async (preferredItemId = selectedItemId) => {
        if (!selectedProdiId) {
            return;
        }

        const response = await api.get(`/pelaksanaan/prodis/${selectedProdiId}`);
        const nextRows = response.data.data?.rows || [];
        setRows(nextRows);
        setSelectedItemId(
            preferredItemId && nextRows.some((row) => String(row.id) === String(preferredItemId))
                ? preferredItemId
                : nextRows[0]?.id || null
        );
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!detail) {
            return;
        }

        if (uploadMode === 'file' && !uploadFile) {
            toast.warning('Pilih dokumen bukti terlebih dahulu.');
            return;
        }

        if (uploadMode === 'link' && !uploadLink.trim()) {
            toast.warning('Masukkan link bukti terlebih dahulu.');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('source_type', uploadMode);
            formData.append('notes', uploadNotes);

            if (uploadMode === 'file') {
                formData.append('file', uploadFile);
            } else {
                formData.append('link_url', uploadLink.trim());
            }

            await api.post(`/borang/items/${detail.id}/evidences`, formData);
            toast.success('Bukti pelaksanaan berhasil diunggah.');
            await refreshRows(detail.id);
            await refreshDetail(detail.id);
            setUploadFile(null);
            setUploadLink('');
            setUploadNotes('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bukti pelaksanaan gagal diunggah.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteEvidence = async (evidenceId) => {
        if (!window.confirm('Hapus bukti pelaksanaan ini?')) {
            return;
        }

        try {
            setDeletingEvidenceId(evidenceId);
            await api.delete(`/evidences/${evidenceId}`);
            toast.success('Bukti pelaksanaan berhasil dihapus.');
            await refreshRows(detail?.id);
            await refreshDetail(detail?.id);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bukti pelaksanaan gagal dihapus.');
        } finally {
            setDeletingEvidenceId(null);
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                            <Icon icon={Icons.execution} width={14} />
                            Pelaksanaan
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Upload Bukti Pelaksanaan per Indikator</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Halaman ini khusus untuk pelaksanaan. Pengguna hanya memilih indikator dari standar lalu mengunggah dokumen atau link bukti. Audit dan evaluasi tetap diproses di halaman lain.
                        </p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${canModify ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        {canModify ? 'Form upload aktif untuk akun ini.' : 'Mode baca aktif. Upload hanya untuk SuperAdmin dan Auditee.'}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-5">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Indikator Standar</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {selectedProdi ? `${selectedProdi.name}${selectedProdi.faculty?.name ? ` • ${selectedProdi.faculty.name}` : ''}` : 'Pilih prodi'}
                        </p>
                    </div>

                    <div className="grid gap-3 border-b border-gray-200 px-6 py-4">
                        <select
                            value={selectedProdiId}
                            onChange={(event) => setSelectedProdiId(event.target.value)}
                            disabled={loadingMeta || prodis.length === 0}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                        >
                            {prodis.map((prodi) => (
                                <option key={prodi.id} value={String(prodi.id)}>
                                    {prodi.name}{prodi.faculty?.name ? ` • ${prodi.faculty.name}` : ''}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari indikator dari standar..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                        />
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto p-4">
                        {loadingRows ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                                Memuat indikator pelaksanaan...
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                                Belum ada indikator pelaksanaan untuk prodi ini.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRows.map((row) => (
                                    <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => setSelectedItemId(row.id)}
                                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                            String(selectedItemId) === String(row.id)
                                                ? 'border-sky-300 bg-sky-50'
                                                : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/50'
                                        }`}
                                    >
                                        <div className="text-sm font-semibold text-gray-900">{row.standard_name}</div>
                                        <div className="mt-2 text-sm leading-6 text-gray-600">{row.indikator}</div>
                                        <div className="mt-3 text-xs text-gray-500">
                                            Bukti tersimpan: {row.evidence_summary?.total || 0}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-6">
                    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        {loadingDetail ? (
                            <div className="text-sm text-gray-500">Memuat indikator terpilih...</div>
                        ) : !detail ? (
                            <div className="text-sm text-gray-500">Pilih indikator dari daftar di kiri untuk mulai upload bukti.</div>
                        ) : (
                            <>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Form Pelaksanaan</div>
                                    <h2 className="mt-3 text-xl font-semibold text-gray-900">Indikator dari Standar</h2>
                                </div>

                                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="text-sm font-semibold text-gray-900">{detail.standard_name}</div>
                                    <div className="mt-2 text-sm leading-6 text-gray-700">{detail.indikator}</div>
                                </div>

                                <form onSubmit={handleUpload} className="mt-6 space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Jenis Bukti</label>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setUploadMode('file')}
                                                className={`rounded-full px-4 py-2 text-sm font-medium ${uploadMode === 'file' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                            >
                                                Upload Dokumen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUploadMode('link')}
                                                className={`rounded-full px-4 py-2 text-sm font-medium ${uploadMode === 'link' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                            >
                                                Link Bukti
                                            </button>
                                        </div>
                                    </div>

                                    {uploadMode === 'file' ? (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Upload Document of Prove</label>
                                            <input
                                                type="file"
                                                onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                                                disabled={!canModify || uploading}
                                                className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 disabled:bg-gray-100"
                                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Link of Prove</label>
                                            <input
                                                type="url"
                                                value={uploadLink}
                                                onChange={(event) => setUploadLink(event.target.value)}
                                                disabled={!canModify || uploading}
                                                placeholder="https://..."
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:bg-gray-100"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Catatan Singkat</label>
                                        <textarea
                                            rows={3}
                                            value={uploadNotes}
                                            onChange={(event) => setUploadNotes(event.target.value)}
                                            disabled={!canModify || uploading}
                                            placeholder="Catatan opsional untuk bukti pelaksanaan"
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:bg-gray-100"
                                        />
                                    </div>

                                    {canModify && (
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                                            >
                                                <Icon icon={Icons.save} width={16} />
                                                {uploading ? 'Mengunggah...' : 'Simpan Bukti'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </>
                        )}
                    </section>

                    {detail && (
                        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Bukti Tersimpan</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Halaman audit dan evaluasi membaca bukti ini dari menu yang terpisah.
                                    </p>
                                </div>
                                <span className="text-sm text-gray-500">{detail.evidences?.length || 0} item</span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {(detail.evidences || []).length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                                        Belum ada bukti pelaksanaan untuk indikator ini.
                                    </div>
                                ) : (
                                    detail.evidences.map((evidence) => (
                                        <div key={evidence.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {evidence.title || evidence.original_name || evidence.link_url || 'Bukti Pelaksanaan'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        {evidence.source_type === 'file'
                                                            ? `${evidence.original_name || evidence.stored_name} • ${formatBytes(evidence.size_bytes)}`
                                                            : evidence.link_url}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {evidence.download_url ? (
                                                        <a
                                                            href={evidence.download_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                                        >
                                                            Unduh
                                                        </a>
                                                    ) : null}
                                                    {evidence.link_url ? (
                                                        <a
                                                            href={evidence.link_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded-full border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                                                        >
                                                            Buka Link
                                                        </a>
                                                    ) : null}
                                                    {canModify && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteEvidence(evidence.id)}
                                                            disabled={deletingEvidenceId === evidence.id}
                                                            className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {deletingEvidenceId === evidence.id ? 'Menghapus...' : 'Hapus'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {evidence.notes ? <div className="mt-3 text-sm leading-6 text-gray-600">{evidence.notes}</div> : null}
                                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                                <span>Uploader: {evidence.uploader?.name || '-'}</span>
                                                <span>Diunggah: {formatDateTime(evidence.created_at)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </section>
            </div>
        </div>
    );
}
