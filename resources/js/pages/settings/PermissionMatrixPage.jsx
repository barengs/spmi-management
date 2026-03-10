import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

export default function PermissionMatrixPage() {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState({});
    const [savingRoleId, setSavingRoleId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatrix = async () => {
            try {
                const response = await api.get('/rbac/matrix');
                const nextRoles = response.data.data.roles;
                const nextPermissions = response.data.data.permissions;

                setRoles(nextRoles);
                setPermissions(nextPermissions);
                setRolePermissions(
                    nextRoles.reduce((carry, role) => {
                        carry[role.id] = role.permissions;
                        return carry;
                    }, {})
                );
            } catch (error) {
                toast.error('Matriks permission gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchMatrix();
    }, []);

    const groupedPermissions = permissions.reduce((carry, permission) => {
        const key = permission.module || 'lainnya';
        if (!carry[key]) {
            carry[key] = [];
        }
        carry[key].push(permission);
        return carry;
    }, {});

    const togglePermission = (roleId, permissionName) => {
        setRolePermissions((current) => {
            const selected = new Set(current[roleId] || []);

            if (selected.has(permissionName)) {
                selected.delete(permissionName);
            } else {
                selected.add(permissionName);
            }

            return {
                ...current,
                [roleId]: Array.from(selected).sort(),
            };
        });
    };

    const saveRolePermissions = async (roleId) => {
        setSavingRoleId(roleId);

        try {
            const response = await api.put(`/rbac/roles/${roleId}`, {
                permission_names: rolePermissions[roleId] || [],
            });

            setRolePermissions((current) => ({
                ...current,
                [roleId]: response.data.data.permissions,
            }));

            toast.success(response.data.message || 'Permission berhasil diperbarui.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Permission gagal disimpan.');
        } finally {
            setSavingRoleId(null);
        }
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
                            Sprint 2
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Permission Matrix</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Kelola hak akses setiap role secara dinamis sesuai backlog Sprint 2. Perubahan disimpan per-role
                            agar jejak revisi lebih terkontrol.
                        </p>
                    </div>
                </div>
            </section>

            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <section key={module} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">
                            {module}
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                        Permission
                                    </th>
                                    {roles.map((role) => (
                                        <th key={role.id} className="min-w-44 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                            <div className="space-y-3">
                                                <div>{role.name}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => saveRolePermissions(role.id)}
                                                    disabled={savingRoleId === role.id}
                                                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <Icon icon={savingRoleId === role.id ? Icons.refresh : Icons.save} width={14} className={savingRoleId === role.id ? 'animate-spin' : ''} />
                                                    Simpan
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {modulePermissions.map((permission) => (
                                    <tr key={permission.name} className="hover:bg-gray-50/80">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{permission.label}</div>
                                            <div className="mt-1 text-xs text-gray-500">{permission.name}</div>
                                        </td>
                                        {roles.map((role) => {
                                            const checked = (rolePermissions[role.id] || []).includes(permission.name);

                                            return (
                                                <td key={`${role.id}-${permission.name}`} className="px-4 py-4 text-center">
                                                    <label className="inline-flex cursor-pointer items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                            checked={checked}
                                                            onChange={() => togglePermission(role.id, permission.name)}
                                                        />
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
        </div>
    );
}
