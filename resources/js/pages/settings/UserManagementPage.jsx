import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

const emptyForm = {
    nidn_npk: '',
    name: '',
    email: '',
    unit_id: '',
    roles: [],
    is_active: true,
};

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [units, setUnits] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        unit_id: '',
        is_active: '',
        page: 1,
    });
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchUsers();
    }, [filters.page]);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUsers = async (overrideFilters = filters) => {
        setLoading(true);

        try {
            const params = new URLSearchParams();
            Object.entries(overrideFilters).forEach(([key, value]) => {
                if (value !== '' && value !== null && value !== undefined) {
                    params.set(key, value);
                }
            });

            const response = await api.get(`/users?${params.toString()}`);
            const payload = response.data.data;

            setUsers(payload.users.data);
            setPagination({
                current_page: payload.users.current_page,
                last_page: payload.users.last_page,
                per_page: payload.users.per_page,
                total: payload.users.total,
                from: payload.users.from,
                to: payload.users.to,
            });
            setRoles(payload.roles || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data pengguna gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnits = async () => {
        try {
            const response = await api.get('/units/flat');
            setUnits(response.data.data || []);
        } catch (error) {
            toast.error('Daftar unit gagal dimuat.');
        }
    };

    const submitFilters = async (event) => {
        event.preventDefault();
        const nextFilters = { ...filters, page: 1 };
        setFilters(nextFilters);
        await fetchUsers(nextFilters);
    };

    const resetFilters = async () => {
        const nextFilters = {
            search: '',
            role: '',
            unit_id: '',
            is_active: '',
            page: 1,
        };

        setFilters(nextFilters);
        await fetchUsers(nextFilters);
    };

    const openCreateModal = () => {
        setEditingUserId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUserId(user.id);
        setForm({
            nidn_npk: user.nidn_npk || '',
            name: user.name || '',
            email: user.email || '',
            unit_id: user.unit_id || '',
            roles: (user.roles || []).map((role) => role.name),
            is_active: Boolean(user.is_active),
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUserId(null);
        setForm(emptyForm);
    };

    const handleFormChange = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleRoleToggle = (roleName) => {
        setForm((current) => {
            const selected = new Set(current.roles);
            if (selected.has(roleName)) {
                selected.delete(roleName);
            } else {
                selected.add(roleName);
            }

            return {
                ...current,
                roles: Array.from(selected).sort(),
            };
        });
    };

    const saveUser = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        const payload = {
            ...form,
            unit_id: form.unit_id || null,
        };

        try {
            const response = editingUserId
                ? await api.put(`/users/${editingUserId}`, payload)
                : await api.post('/users', payload);

            toast.success(response.data.message || 'Pengguna berhasil disimpan.');
            closeModal();
            await fetchUsers();
        } catch (error) {
            const message = error.response?.data?.message || 'Pengguna gagal disimpan.';
            const validationErrors = error.response?.data?.errors;

            if (validationErrors) {
                const firstError = Object.values(validationErrors).flat()[0];
                toast.error(firstError || message);
            } else {
                toast.error(message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const sendReset = async (user) => {
        try {
            const response = await api.post(`/users/${user.id}/force-reset`);
            toast.success(response.data.message || `Link reset password dikirim ke ${user.email}.`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Reset password gagal dikirim.');
        }
    };

    const deactivateUser = async (user) => {
        const confirmed = window.confirm(`Nonaktifkan pengguna ${user.name}?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await api.delete(`/users/${user.id}`);
            toast.success(response.data.message || 'Pengguna berhasil dinonaktifkan.');

            if (users.length === 1 && (pagination?.current_page || 1) > 1) {
                const nextPage = filters.page - 1;
                const nextFilters = { ...filters, page: nextPage };
                setFilters(nextFilters);
                await fetchUsers(nextFilters);
                return;
            }

            await fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Pengguna gagal dinonaktifkan.');
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                            <Icon icon={Icons.shield} width={14} />
                            Super Administrator
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Manajemen Pengguna</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Kelola akun, unit kerja, status aktif, dan assignment role untuk seluruh pengguna aplikasi E-SPMI.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Pengguna
                    </button>
                </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <form onSubmit={submitFilters} className="grid gap-4 lg:grid-cols-5">
                    <label className="space-y-2 lg:col-span-2">
                        <span className="text-sm font-medium text-gray-700">Pencarian</span>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Nama, email, atau NIDN/NPK"
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Role</span>
                        <select
                            value={filters.role}
                            onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="">Semua role</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.name}>{role.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Unit</span>
                        <select
                            value={filters.unit_id}
                            onChange={(event) => setFilters((current) => ({ ...current, unit_id: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="">Semua unit</option>
                            {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <select
                            value={filters.is_active}
                            onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="">Semua status</option>
                            <option value="true">Aktif</option>
                            <option value="false">Nonaktif</option>
                        </select>
                    </label>

                    <div className="flex items-end gap-3 lg:col-span-5">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
                        >
                            <Icon icon={Icons.search} width={18} />
                            Terapkan Filter
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                            <Icon icon={Icons.refresh} width={18} />
                            Reset
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Daftar Pengguna</h2>
                        {pagination && (
                            <p className="mt-1 text-sm text-gray-500">
                                Menampilkan {pagination.from || 0}-{pagination.to || 0} dari {pagination.total} pengguna
                            </p>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pengguna</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Unit</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat data pengguna...
                                    </td>
                                </tr>
                            )}

                            {!loading && users.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                                        Belum ada data pengguna yang sesuai dengan filter.
                                    </td>
                                </tr>
                            )}

                            {!loading && users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/80">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-medium text-gray-900">{user.name}</div>
                                        <div className="mt-1 text-sm text-gray-500">{user.email}</div>
                                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-400">
                                            {user.nidn_npk || 'Tanpa NIDN/NPK'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm text-gray-600">
                                        {user.unit?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-wrap gap-2">
                                            {(user.roles || []).length > 0 ? user.roles.map((role) => (
                                                <span key={role.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    {role.name}
                                                </span>
                                            )) : (
                                                <span className="text-sm text-gray-400">Belum ada role</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.is_active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {user.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(user)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                <Icon icon={Icons.edit} width={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => sendReset(user)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                                            >
                                                <Icon icon={Icons.refresh} width={14} />
                                                Reset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deactivateUser(user)}
                                                disabled={!user.is_active}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Icon icon={Icons.delete} width={14} />
                                                Nonaktifkan
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.last_page > 1 && (
                    <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500">
                            Halaman {pagination.current_page} dari {pagination.last_page}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
                                disabled={pagination.current_page <= 1}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Icon icon={Icons.prev} width={16} />
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilters((current) => ({ ...current, page: Math.min(pagination.last_page, current.page + 1) }))}
                                disabled={pagination.current_page >= pagination.last_page}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Berikutnya
                                <Icon icon={Icons.next} width={16} />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {editingUserId ? 'Ubah Pengguna' : 'Tambah Pengguna'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {editingUserId
                                        ? 'Perbarui identitas, role, unit, dan status akun.'
                                        : 'Buat akun baru dan kirimkan email set password pertama.'}
                                </p>
                            </div>
                            <button type="button" onClick={closeModal} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
                                <Icon icon={Icons.close} width={20} />
                            </button>
                        </div>

                        <form onSubmit={saveUser} className="space-y-6 px-6 py-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">NIDN / NPK</span>
                                    <input
                                        type="text"
                                        value={form.nidn_npk}
                                        onChange={(event) => handleFormChange('nidn_npk', event.target.value)}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Status Akun</span>
                                    <select
                                        value={form.is_active ? 'true' : 'false'}
                                        onChange={(event) => handleFormChange('is_active', event.target.value === 'true')}
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="true">Aktif</option>
                                        <option value="false">Nonaktif</option>
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Nama Lengkap</span>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(event) => handleFormChange('name', event.target.value)}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700">Email</span>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => handleFormChange('email', event.target.value)}
                                        required
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>
                            </div>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-gray-700">Unit Kerja</span>
                                <select
                                    value={form.unit_id}
                                    onChange={(event) => handleFormChange('unit_id', event.target.value)}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="">Tanpa unit</option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.name} ({unit.level})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Role Pengguna</span>
                                    <p className="mt-1 text-sm text-gray-500">Satu pengguna dapat memiliki lebih dari satu role.</p>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {roles.map((role) => {
                                        const checked = form.roles.includes(role.name);

                                        return (
                                            <label
                                                key={role.id}
                                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => handleRoleToggle(role.name)}
                                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="text-sm font-medium text-gray-800">{role.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    <Icon icon={Icons.cancel} width={18} />
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Icon icon={submitting ? Icons.refresh : Icons.save} width={18} className={submitting ? 'animate-spin' : ''} />
                                    {editingUserId ? 'Simpan Perubahan' : 'Buat Pengguna'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
