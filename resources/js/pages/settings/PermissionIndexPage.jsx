import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

export default function PermissionIndexPage() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await api.get('/rbac/permissions');
                setPermissions(response.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Daftar permission gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    const modules = useMemo(
        () => Array.from(new Set(permissions.map((permission) => permission.module || 'lainnya'))).sort((left, right) => left.localeCompare(right, 'id-ID')),
        [permissions]
    );

    const filteredPermissions = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return permissions.filter((permission) => {
            const matchesModule = !moduleFilter || (permission.module || 'lainnya') === moduleFilter;
            const matchesSearch = !keyword || `${permission.name} ${permission.label}`.toLowerCase().includes(keyword);

            return matchesModule && matchesSearch;
        });
    }, [moduleFilter, permissions, search]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            <Icon icon={Icons.settings} width={14} />
                            Super Administrator
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Manajemen Permission</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Kelola daftar permission sistem secara terpisah dari halaman role. Gunakan halaman ini untuk melihat, menambah, dan mengubah permission.
                        </p>
                    </div>

                    <Link
                        to="/settings/permissions/add"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Permission
                    </Link>
                </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Cari Permission</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama permission..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Filter Modul</span>
                        <select
                            value={moduleFilter}
                            onChange={(event) => setModuleFilter(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                            <option value="">Semua modul</option>
                            {modules.map((module) => (
                                <option key={module} value={module}>{module}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Permission</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Modul</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-sm text-gray-500">Memuat data permission...</td>
                                </tr>
                            )}

                            {!loading && filteredPermissions.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-sm text-gray-500">Belum ada permission yang sesuai dengan filter.</td>
                                </tr>
                            )}

                            {!loading && filteredPermissions.map((permission) => (
                                <tr key={permission.id} className="hover:bg-gray-50/80">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{permission.label}</div>
                                        <div className="mt-1 text-sm text-gray-500">{permission.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{permission.module || 'lainnya'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end">
                                            <Link
                                                to={`/settings/permissions/${permission.id}/edit`}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                            >
                                                <Icon icon={Icons.edit} width={14} />
                                                Edit
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
