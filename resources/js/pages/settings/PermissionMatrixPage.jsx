import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

export default function PermissionMatrixPage() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creatingRole, setCreatingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRolePermissions, setNewRolePermissions] = useState([]);
    const [newRolePermissionSearch, setNewRolePermissionSearch] = useState('');
    const [newRolePermissionModule, setNewRolePermissionModule] = useState('');

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await api.get('/rbac/matrix');
                const nextPermissions = response.data.data.permissions;

                setPermissions(nextPermissions);
            } catch (error) {
                toast.error('Data permission gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    const permissionModules = useMemo(() => (
        Array.from(new Set(permissions.map((permission) => permission.module || 'lainnya')))
            .sort((left, right) => left.localeCompare(right, 'id-ID'))
    ), [permissions]);

    const filteredCreatePermissions = useMemo(() => {
        const search = newRolePermissionSearch.trim().toLowerCase();

        return permissions.filter((permission) => {
            const matchesModule = !newRolePermissionModule || (permission.module || 'lainnya') === newRolePermissionModule;
            const matchesSearch = !search || `${permission.label} ${permission.name}`.toLowerCase().includes(search);

            return matchesModule && matchesSearch;
        });
    }, [newRolePermissionModule, newRolePermissionSearch, permissions]);

    const createRole = async (event) => {
        event.preventDefault();

        try {
            setCreatingRole(true);
            const response = await api.post('/rbac/roles', {
                name: newRoleName.trim(),
                permission_names: newRolePermissions,
            });

            setNewRoleName('');
            setNewRolePermissions([]);
            toast.success(response.data.message || 'Role berhasil dibuat.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Role gagal dibuat.');
        } finally {
            setCreatingRole(false);
        }
    };

    const toggleNewRolePermission = (permissionName) => {
        setNewRolePermissions((current) => {
            const selected = new Set(current);

            if (selected.has(permissionName)) {
                selected.delete(permissionName);
            } else {
                selected.add(permissionName);
            }

            return Array.from(selected).sort();
        });
    };

    if (loading) {
        return (
            <div className="p-6 sm:p-8">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <p className="text-sm text-gray-500">Memuat matriks permission...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            <Icon icon={Icons.shield} width={14} />
                            Super Administrator
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Manajemen Role</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Buat role baru untuk kebutuhan standar maupun operasional. Pengelolaan permission dipisahkan ke halaman permission tersendiri.
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Role penetapan standar yang sudah disiapkan: <strong>Perumus</strong>, <strong>Pemeriksa</strong>, <strong>Persetujuan</strong>, <strong>Pertimbangan</strong>, dan <strong>Pengendalian</strong>.
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <form onSubmit={createRole} className="space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Tambah Role Baru</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Isi nama role terlebih dahulu, lalu pilih permission awal di bawahnya. Gunakan filter agar daftar permission tetap ringkas.
                        </p>
                    </div>

                    <label className="block space-y-2">
                        <span className="text-sm font-medium text-gray-700">Nama Role</span>
                        <input
                            type="text"
                            value={newRoleName}
                            onChange={(event) => setNewRoleName(event.target.value)}
                            placeholder="Contoh: Peninjau Standar"
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                    </label>

                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">Cari Permission</span>
                            <input
                                type="text"
                                value={newRolePermissionSearch}
                                onChange={(event) => setNewRolePermissionSearch(event.target.value)}
                                placeholder="Cari nama permission..."
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">Filter Modul</span>
                            <select
                                value={newRolePermissionModule}
                                onChange={(event) => setNewRolePermissionModule(event.target.value)}
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            >
                                <option value="">Semua modul</option>
                                {permissionModules.map((module) => (
                                    <option key={`create-module-${module}`} value={module}>{module}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="max-h-80 overflow-y-auto rounded-2xl border border-gray-200">
                        <div className="divide-y divide-gray-100">
                            {filteredCreatePermissions.map((permission) => {
                                const checked = newRolePermissions.includes(permission.name);

                                return (
                                    <label
                                        key={`new-role-permission-${permission.name}`}
                                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition ${checked ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleNewRolePermission(permission.name)}
                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-800">{permission.label}</span>
                                            <span className="block text-xs text-gray-500">{permission.name}</span>
                                        </span>
                                        <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                            {permission.module || 'lainnya'}
                                        </span>
                                    </label>
                                );
                            })}

                            {filteredCreatePermissions.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-gray-500">
                                    Tidak ada permission yang cocok dengan filter.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-500">
                            {newRolePermissions.length} permission dipilih
                        </div>
                        <button
                            type="submit"
                            disabled={creatingRole || !newRoleName.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={creatingRole ? Icons.refresh : Icons.add} width={18} className={creatingRole ? 'animate-spin' : ''} />
                            Buat Role
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
