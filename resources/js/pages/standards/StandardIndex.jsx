import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { toast } from 'react-toastify';
import StandardCloneModal from './StandardCloneModal';
import Icon, { Icons } from '../../components/ui/Icon';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel
} from '@tanstack/react-table';

export default function StandardIndex() {
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');

    const user = useSelector(state => state.auth.user);
    const isPimpinan = user?.roles?.some(r => r.name === 'Pimpinan');

    // Modal state for Create/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneTarget, setCloneTarget] = useState(null);
    const [editingStandard, setEditingStandard] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Institusi',
        periode_tahun: new Date().getFullYear(),
        is_active: true,
        referensi_regulasi: ''
    });

    useEffect(() => {
        fetchStandards();
    }, []);

    const fetchStandards = async () => {
        try {
            setLoading(true);
            const response = await api.get('/standards');
            setStandards(response.data.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data standar.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (standard = null) => {
        if (standard) {
            setEditingStandard(standard);
            setFormData({
                name: standard.name,
                category: standard.category,
                periode_tahun: standard.periode_tahun || '',
                is_active: standard.is_active,
                referensi_regulasi: standard.referensi_regulasi || ''
            });
        } else {
            setEditingStandard(null);
            setFormData({
                name: '',
                category: 'Institusi',
                periode_tahun: new Date().getFullYear(),
                is_active: true,
                referensi_regulasi: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStandard(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingStandard) {
                await api.put(`/standards/${editingStandard.id}`, formData);
                toast.success('Standar Mutu berhasil diperbarui.');
            } else {
                await api.post('/standards', formData);
                toast.success('Standar Mutu baru berhasil dibuat.');
            }
            fetchStandards();
            handleCloseModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan standar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus standar ini? Semua komponen di dalamnya juga akan ikut terhapus secara berjenjang.')) {
            try {
                await api.delete(`/standards/${id}`);
                toast.success('Standar berhasil dihapus seluruhnya.');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus standar.');
            }
        }
    };

    const handleSubmitForApproval = async (id) => {
        if (window.confirm('Ajukan Standar Mutu ini ke Pimpinan untuk direview? Selama masa review, standar akan dikunci sementara.')) {
            try {
                await api.patch(`/standards/${id}/submit`);
                toast.success('Standar Mutu berhasil DIAJUKAN.');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal mengajukan standar.');
            }
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Setujui Standar Mutu ini? Aksi ini akan mengunci dokumen secara PERMANEN (Terbit).')) {
            try {
                await api.patch(`/standards/${id}/approve`);
                toast.success('Standar Mutu disetujui dan Diterbitkan (Locked).');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menyetujui standar.');
            }
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Alasan menolak Standar Mutu ini? (Wajib diisi)');
        if (reason !== null) {
            if (reason.trim() === '') {
                toast.warning('Alasan penolakan harus diisi!');
                return;
            }
            try {
                await api.patch(`/standards/${id}/reject`, { reason });
                toast.success('Standar Mutu berhasil ditolak untuk Direvisi.');
                fetchStandards();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menolak standar.');
            }
        }
    };

    const handleOpenCloneModal = (standard) => {
        setCloneTarget(standard);
        setIsCloneModalOpen(true);
    };

    // TanStack Table Setup
    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Nama Standar',
            cell: info => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">{info.getValue()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate max-w-xs" title={info.row.original.referensi_regulasi}>
                        {info.row.original.referensi_regulasi || 'Tidak ada referensi regulasi'}
                    </div>
                </div>
            )
        }),
        columnHelper.accessor('category', {
            header: 'Kategori',
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${val === 'SN-Dikti' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                        {val}
                    </span>
                );
            }
        }),
        columnHelper.accessor('periode_tahun', {
            header: 'Periode',
            cell: info => <span className="text-gray-600 dark:text-gray-300">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue() || 'DRAFT';
                if (status === 'TERBIT') {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold leading-5 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800">
                            <Icon icon={Icons.shield} width={14} />
                            Terbit
                        </span>
                    );
                }
                if (status === 'WAITING_APPROVAL') {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold leading-5 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800 animate-pulse">
                            <Icon icon={Icons.pending} width={14} />
                            Menunggu Review
                        </span>
                    );
                }
                if (status === 'REVISI') {
                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold leading-5 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-800">
                                <Icon icon={Icons.refresh} width={14} />
                                Revisi
                            </span>
                            {info.row.original.reject_reason && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 italic max-w-xs truncate" title={info.row.original.reject_reason}>
                                    Catatan: {info.row.original.reject_reason}
                                </span>
                            )}
                        </div>
                    );
                }
                // DRAFT
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold leading-5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow-sm border border-amber-200 dark:border-amber-800">
                        <Icon icon={Icons.draft} width={14} />
                        Draft
                    </span>
                );
            }
        }),
        columnHelper.accessor('is_active', {
            header: 'Visibilitas',
            cell: info => {
                const isActive = info.getValue();
                return isActive ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold leading-5 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Aktif</span>
                ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold leading-5 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Non-Aktif</span>
                );
            }
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Aksi',
            cell: info => {
                const item = info.row.original;
                const isLockedForAdmin = item.status === 'WAITING_APPROVAL' || item.status === 'TERBIT';

                return (
                    <div className="flex space-x-3 justify-end text-sm font-medium items-center flex-wrap gap-y-2">
                        {/* Selalu tersedia: Builder dan Salin */}
                        {(!isPimpinan || item.status !== 'DRAFT') && (
                            <Link
                                to={`/standards/${item.id}/builder`}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Struktur
                            </Link>
                        )}
                        {!isPimpinan && (
                            <button onClick={() => handleOpenCloneModal(item)} className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300" title="Salin ke periode baru">
                                Salin
                            </button>
                        )}

                        {/* LPM-Admin Actions */}
                        {!isPimpinan && (item.status === 'DRAFT' || item.status === 'REVISI') && (
                            <button onClick={() => handleSubmitForApproval(item.id)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded" title="Ajukan Review ke Pimpinan">
                                Ajukan
                            </button>
                        )}

                        {!isPimpinan && (
                            <>
                                <button
                                    onClick={() => handleOpenModal(item)}
                                    disabled={isLockedForAdmin}
                                    className={`transition-colors ${isLockedForAdmin ? 'text-gray-400 cursor-not-allowed opacity-50 dark:text-gray-600' : 'text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300'}`}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={isLockedForAdmin}
                                    className={`transition-colors ${isLockedForAdmin ? 'text-gray-400 cursor-not-allowed opacity-50 dark:text-gray-600' : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'}`}
                                >
                                    Hapus
                                </button>
                            </>
                        )}

                        {/* Pimpinan Actions */}
                        {isPimpinan && item.status === 'WAITING_APPROVAL' && (
                            <div className="flex items-center space-x-2 border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
                                <button onClick={() => handleApprove(item.id)} className="text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 px-2 py-1 rounded text-xs font-bold transition-colors">
                                    Setujui
                                </button>
                                <button onClick={() => handleReject(item.id)} className="text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 dark:text-rose-300 dark:bg-rose-900/60 dark:hover:bg-rose-800 px-2 py-1 rounded text-xs font-bold transition-colors">
                                    Tolak
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
        })
    ], [standards]);

    const table = useReactTable({
        data: standards,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: 10,
            }
        }
    });

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dokumen Standar Mutu</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                        Daftar seluruh dokumen SN-Dikti dan Standar Institusi untuk penjaminan mutu jenjang perguruan tinggi.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-1 justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Standar
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                    {error}
                </div>
            )}

            {/* Table Controls (Search & View) */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-full sm:max-w-xs relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon={Icons.search} width={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Cari standar..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="mt-4 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800/80">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 group cursor-pointer"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {{
                                                            asc: <Icon icon={Icons.sortAsc} width={14} />,
                                                            desc: <Icon icon={Icons.sortDesc} width={14} />,
                                                        }[header.column.getIsSorted()] ?? <Icon icon={Icons.sort} width={14} className="opacity-0 group-hover:opacity-100 text-gray-300" />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : table.getRowModel().rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Tidak ada data standar ditemukan.
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {table.getPageCount() > 1 && !loading && (
                                <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="relative inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            <Icon icon={Icons.prev} width={16} />
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="ml-3 relative inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            Next
                                            <Icon icon={Icons.next} width={16} />
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                                Halaman <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> dari <span className="font-medium">{table.getPageCount()}</span>
                                                {' '}<span>({table.getPrePaginationRowModel().rows.length} Total Data)</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => table.setPageIndex(0)}
                                                    disabled={!table.getCanPreviousPage()}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.first} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.previousPage()}
                                                    disabled={!table.getCanPreviousPage()}
                                                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.prev} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.nextPage()}
                                                    disabled={!table.getCanNextPage()}
                                                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.next} width={20} />
                                                </button>
                                                <button
                                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                                    disabled={!table.getCanNextPage()}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    <Icon icon={Icons.last} width={20} />
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white" id="modal-title">
                                    {editingStandard ? 'Edit Standar Mutu' : 'Tambah Standar Mutu Baru'}
                                </h3>
                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    Silakan lengkapi formulir informasi dasar kepatuhan standar mutu berikut.
                                </div>
                                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Standar <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            placeholder="Contoh: Standar Kompetensi Lulusan"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Kategori Utama</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            >
                                                <option value="SN-Dikti">SN-Dikti</option>
                                                <option value="Institusi">Standar Institusi (Pelampauan)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tahun Implementasi</label>
                                            <input
                                                type="number"
                                                value={formData.periode_tahun}
                                                onChange={(e) => setFormData({ ...formData, periode_tahun: e.target.value })}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Referensi Regulasi</label>
                                        <textarea
                                            rows="2"
                                            value={formData.referensi_regulasi}
                                            onChange={(e) => setFormData({ ...formData, referensi_regulasi: e.target.value })}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                                            placeholder="SK Rektor No. XX Tahun YYYY / Permen No. XX Tahun YYYY"
                                        ></textarea>
                                    </div>
                                    <div className="flex items-center pt-2">
                                        <input
                                            id="is_active"
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label htmlFor="is_active" className="ml-3 block text-sm font-semibold text-gray-900 dark:text-gray-200">
                                            Status Aktif (Berlaku Siklus Saat Ini)
                                        </label>
                                    </div>
                                    <div className="mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full inline-flex justify-center rounded-md flex-row items-center gap-1 border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="animate-spin">
                                                        <Icon icon={Icons.refresh} width={16} />
                                                    </span>
                                                    Merekam Data...
                                                </>
                                            ) : (
                                                <>
                                                    <Icon icon={Icons.save} width={16} />
                                                    Simpan Dokumen
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <StandardCloneModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                originalStandard={cloneTarget}
                onSuccess={fetchStandards}
            />
        </div>
    );
}
