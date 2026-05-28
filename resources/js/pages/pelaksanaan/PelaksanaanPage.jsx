import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
    const { prodiId, itemId } = useParams();
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
    const [schedules, setSchedules] = useState([]);
    const [rows, setRows] = useState([]);
    const [detail, setDetail] = useState(null);
    const [search, setSearch] = useState('');
    const [uploadMode, setUploadMode] = useState('file');
    const [uploadLink, setUploadLink] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNotes, setUploadNotes] = useState('');

    const isProdiIndex = !prodiId && !itemId;
    const isProdiStandards = Boolean(prodiId) && !itemId;
    const isItemDetail = Boolean(itemId);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                setLoadingMeta(true);
                const [prodiResponse, schedulesResponse] = await Promise.all([
                    api.get('/pelaksanaan/prodis'),
                    api.get('/audit-schedules'),
                ]);
                setProdis(prodiResponse.data.data?.prodis || []);
                setSchedules(schedulesResponse.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Daftar prodi pelaksanaan gagal dimuat.');
            } finally {
                setLoadingMeta(false);
            }
        };

        fetchMeta();
    }, []);

    const selectedProdi = useMemo(
        () => prodis.find((prodi) => String(prodi.id) === String(prodiId)) || null,
        [prodiId, prodis]
    );
    const selectedProdiSchedule = useMemo(
        () => schedules.find((schedule) => String(schedule?.prodi?.id || '') === String(prodiId)) || null,
        [prodiId, schedules]
    );

    useEffect(() => {
        if (!isProdiStandards || !selectedProdi) {
            setRows([]);
            return;
        }

        const fetchProdiRows = async () => {
            try {
                setLoadingRows(true);
                const response = await api.get(`/pelaksanaan/prodis/${selectedProdi.id}`);
                const nextRows = (response.data.data?.rows || []).map((row) => ({
                    ...row,
                    prodi: selectedProdi,
                }));
                setRows(nextRows);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Daftar standar pelaksanaan gagal dimuat.');
            } finally {
                setLoadingRows(false);
            }
        };

        fetchProdiRows();
    }, [isProdiStandards, selectedProdi]);

    useEffect(() => {
        if (!isItemDetail || !itemId) {
            setDetail(null);
            return;
        }

        const fetchDetail = async () => {
            try {
                setLoadingDetail(true);
                const response = await api.get(`/pelaksanaan/items/${itemId}`);
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
    }, [isItemDetail, itemId]);

    const filteredRows = useMemo(() => (
        rows.filter((row) => (
            `${row.standard_name} ${row.indikator} ${row.prodi?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase())
        ))
    ), [rows, search]);

    const refreshDetail = async () => {
        if (!itemId) {
            return;
        }

        const response = await api.get(`/pelaksanaan/items/${itemId}`);
        setDetail(response.data.data || null);
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
            await refreshDetail();
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
            await refreshDetail();
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
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                            {isProdiIndex
                                ? 'Daftar Prodi Pelaksanaan'
                                : isProdiStandards
                                    ? `Daftar Standar ${selectedProdi?.name || ''}`.trim()
                                    : 'Detail Dokumen Pelaksanaan'}
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            {isProdiIndex
                                ? 'Halaman awal pelaksanaan menampilkan daftar prodi. Masuk ke masing-masing prodi untuk melihat daftar standar saat ini.'
                                : isProdiStandards
                                    ? 'Halaman ini menampilkan daftar standar dan indikator per prodi beserta akses ke detail dokumen buktinya.'
                                    : 'Halaman ini menampilkan seluruh dokumen bukti atau capaian yang terkait dengan satu indikator standar.'}
                        </p>
                    </div>

                    {!isProdiIndex && (
                        <Link
                            to={isProdiStandards ? '/pelaksanaan' : `/pelaksanaan/prodis/${detail?.prodi?.id || prodiId}/standards`}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                        >
                            <Icon icon={Icons.back} width={16} />
                            Kembali
                        </Link>
                    )}
                </div>
            </section>

            {isProdiStandards && selectedProdi && (
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prodi</div>
                            <div className="mt-2 text-sm font-semibold text-gray-900">{selectedProdi.name}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Fakultas</div>
                            <div className="mt-2 text-sm font-semibold text-gray-900">{selectedProdi.faculty?.name || '-'}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Auditee</div>
                            <div className="mt-2 text-sm font-semibold text-gray-900">{selectedProdiSchedule?.auditee?.name || '-'}</div>
                            <div className="mt-1 text-xs text-gray-500">{selectedProdiSchedule?.auditee?.email || 'Belum ada jadwal audit'}</div>
                        </div>
                    </div>
                </section>
            )}

            {isProdiIndex && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Prodi</h2>
                            <span className="text-sm text-gray-500">{prodis.length} prodi</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Prodi</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Fakultas</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Kode</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loadingMeta ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Memuat daftar prodi...</td>
                                    </tr>
                                ) : prodis.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Belum ada prodi yang dapat diakses.</td>
                                    </tr>
                                ) : (
                                    prodis.map((prodi) => (
                                        <tr key={prodi.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{prodi.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{prodi.faculty?.name || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{prodi.code || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    to={`/pelaksanaan/prodis/${prodi.id}/standards`}
                                                    className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                                                >
                                                    <Icon icon={Icons.eye} width={16} />
                                                    Lihat Standar
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {isProdiStandards && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="grid gap-3 border-b border-gray-200 px-6 py-4">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari standar, indikator, atau prodi..."
                            className="w-full rounded-2xl border border-gray-200 py-3 pl-4 pr-4 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standar</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Indikator</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prodi</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Bukti</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loadingRows ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Memuat daftar standar...</td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Belum ada standar untuk prodi ini.</td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{row.standard_name}</td>
                                            <td className="px-6 py-4 text-sm leading-6 text-gray-700">{row.indikator}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{row.prodi?.name || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{row.evidence_summary?.total || 0} dokumen</td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    to={`/pelaksanaan/items/${row.id}`}
                                                    className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                                                >
                                                    <Icon icon={Icons.eye} width={16} />
                                                    Detail
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {isItemDetail && (
                <section className="space-y-6">
                    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        {loadingDetail ? (
                            <div className="text-sm text-gray-500">Memuat detail indikator...</div>
                        ) : !detail ? (
                            <div className="text-sm text-gray-500">Detail indikator tidak ditemukan.</div>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="text-sm font-semibold text-gray-900">{detail.standard_name}</div>
                                    <div className="mt-2 text-sm leading-6 text-gray-700">{detail.indikator}</div>
                                    <div className="mt-3 text-xs text-gray-500">
                                        {detail.prodi?.name || '-'}{detail.faculty?.name ? ` • ${detail.faculty.name}` : ''}
                                    </div>
                                </div>

                                {canModify && (
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
                                                    disabled={uploading}
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
                                                    disabled={uploading}
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
                                                disabled={uploading}
                                                placeholder="Catatan opsional untuk bukti pelaksanaan"
                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:bg-gray-100"
                                            />
                                        </div>

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
                                    </form>
                                )}
                            </>
                        )}
                    </section>

                    {detail && (
                        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Dokumen Bukti dan Capaian</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Seluruh dokumen pembuktian yang terkait dengan standar atau indikator ini.
                                    </p>
                                </div>
                                <span className="text-sm text-gray-500">{detail.evidences?.length || 0} item</span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {(detail.evidences || []).length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                                        Belum ada dokumen bukti atau capaian terkait untuk indikator ini.
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
            )}
        </div>
    );
}
