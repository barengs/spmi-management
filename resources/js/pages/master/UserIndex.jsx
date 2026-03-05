import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiMail, FiKey } from 'react-icons/fi';
import api from '../../services/api';

export default function UserIndex() {
    const [users, setUsers] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resetingId, setResetingId] = useState(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const initialFormState = {
        id: null,
        name: '',
        email: '',
        nidn_npk: '',
        unit_id: '',
        roles: [],
        is_active: true
    };
    const [formData, setFormData] = useState(initialFormState);

    const systemRoles = [
        'SuperAdmin',
        'LPM-Admin',
        'Auditor',
        'Auditee',
        'Pimpinan',
        'Observer'
    ];

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    const fetchInitialData = async () => {
        try {
            const res = await api.get('/units/flat');
            setUnits(res.data.data);
        } catch (error) {
            toast.error('Gagal memuat daftar unit');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/users?page=${page}&search=${search}`);
            setUsers(res.data.data.data);
            setTotalPages(res.data.data.last_page);
        } catch (error) {
            toast.error('Gagal memuat data pengguna');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            const roleNames = user.roles ? user.roles.map(r => r.name) : [];
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                nidn_npk: user.nidn_npk || '',
                unit_id: user.unit_id || '',
                roles: roleNames,
                is_active: user.is_active
            });
        } else {
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleRoleSelection = (e) => {
        const value = Array.from(e.target.selectedOptions, option => option.value);
        setFormData({ ...formData, roles: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = {
                ...formData,
                unit_id: formData.unit_id ? parseInt(formData.unit_id) : null
            };

            if (formData.id) {
                await api.put(`/users/${formData.id}`, payload);
                toast.success('Pengguna berhasil diperbarui');
            } else {
                await api.post('/users', payload);
                toast.success('Pengguna baru berhasil ditambahkan');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
                if (error.response.data.errors) {
                    const errorMsgs = Object.values(error.response.data.errors).flat().join('\n');
                    toast.error(errorMsgs);
                }
            } else {
                toast.error('Gagal menyimpan pengguna');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menonaktifkan/menghapus pengguna ini?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Pengguna berhasil dihapus');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menghapus pengguna');
        }
    };

    const handleForceReset = async (id) => {
        if (!window.confirm('Kirimkan link reset password ke email pengguna?')) return;
        try {
            setResetingId(id);
            await api.post(`/users/${id}/force-reset`);
            toast.success('Link reset berhasil dikirim ke email');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengirim link reset');
        } finally {
            setResetingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto lg:px-8">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data: Pengguna</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manajemen data dosen, tenaga kependidikan, auditor, dan pengaturan Hak Akses (Role).
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                    <input
                        type="text"
                        placeholder="Cari nama, email, NIDN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setPage(1);
                                fetchUsers();
                            }
                        }}
                    />
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 whitespace-nowrap"
                    >
                        <FiPlus className="-ml-1 mr-2 h-4 w-4" /> Tambah Pengguna
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-left">
                {loading && users.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12">
                        <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum Ada Data Pengguna</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tambahkan akun pengguna untuk mulai menggunakan E-SPMI.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/80">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Nama & NIDN</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Kontak & Unit</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Hak Akses (Roles)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">NIDN/NPK: {user.nidn_npk || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-900 dark:text-white space-x-1">
                                                <FiMail className="h-3 w-3 text-gray-400 mr-1" />
                                                <a href={`mailto:${user.email}`} className="hover:underline">{user.email}</a>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {user.unit ? `${user.unit.name}` : 'Unit: All / Eksternal'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles && user.roles.map(role => (
                                                    <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {role.name}
                                                    </span>
                                                ))}
                                                {(!user.roles || user.roles.length === 0) && (
                                                    <span className="text-xs text-gray-400 italic">No Role</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {user.is_active ? 'Aktif' : 'NonAktif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleForceReset(user.id)}
                                                disabled={resetingId === user.id}
                                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 mr-3" title="Kirim Link Reset Password"
                                            >
                                                {resetingId === user.id ? 'Mengirim...' : <FiKey className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => handleOpenModal(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3" title="Edit Pengguna">
                                                <FiEdit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Hapus Pengguna">
                                                <FiTrash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 pb-4 border-t border-gray-200 dark:border-gray-700 sm:px-6 flex justify-between items-center">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Halaman <span className="font-medium">{page}</span> dari <span className="font-medium">{totalPages}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Sebelumnya
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-500/75 dark:bg-gray-900/80 p-4 transition-opacity" onClick={() => setIsModalOpen(false)}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 transform transition-all" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSave}>
                            <div className="px-6 pt-6 pb-4">
                                <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
                                    {formData.id ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                                </h3>
                                <div className="space-y-4 text-left">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                                            <input
                                                type="text" required
                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Akun</label>
                                            <input
                                                type="email" required
                                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIDN / NPK</label>
                                            <input
                                                type="text"
                                                value={formData.nidn_npk} onChange={e => setFormData({ ...formData, nidn_npk: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Afiliasi / Homebase</label>
                                            <select
                                                value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                <option value="">-- Tidak Memiliki (Unit Eksternal) --</option>
                                                {units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} (Tk.{u.level})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded mt-4 border border-gray-200 dark:border-gray-600">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Penetapan Role (Multi-Selection)</label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Tekan dan tahan CTRL / CMD untuk memilih lebih dari 1 role.</p>
                                        <select
                                            multiple size={6}
                                            value={formData.roles}
                                            onChange={handleRoleSelection}
                                            className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
                                        >
                                            {systemRoles.map(role => (
                                                <option key={role} value={role} className="py-1 px-2 border-b border-gray-100 dark:border-gray-600">{role}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center mt-4">
                                        <input
                                            id="is_active" type="checkbox"
                                            checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            Status Akun Aktif
                                        </label>
                                    </div>

                                    {!formData.id && (
                                        <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded">
                                            Catatan: Sistem akan mengirimkan link reset ke email secara otomatis untuk setup _password_ pertama kali.
                                        </p>
                                    )}

                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                                <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm" >
                                    {saving ? 'Menyimpan...' : 'Simpan Pengguna'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
