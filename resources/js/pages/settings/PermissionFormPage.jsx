import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

const initialForm = {
    module: '',
    action: '',
};

export default function PermissionFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isEdit) {
            return;
        }

        const fetchPermission = async () => {
            try {
                const response = await api.get(`/rbac/permissions/${id}`);
                const permission = response.data.data;

                setForm({
                    module: permission.module || '',
                    action: permission.action || '',
                });
            } catch (error) {
                toast.error(error.response?.data?.message || 'Data permission gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchPermission();
    }, [id, isEdit]);

    const previewName = useMemo(() => {
        const modulePart = form.module.trim();
        const actionPart = form.action.trim();

        return modulePart && actionPart ? `${modulePart}.${actionPart}` : '-';
    }, [form.action, form.module]);

    const savePermission = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                module: form.module.trim().toLowerCase(),
                action: form.action.trim().toLowerCase(),
            };

            const response = isEdit
                ? await api.put(`/rbac/permissions/${id}`, payload)
                : await api.post('/rbac/permissions', payload);

            toast.success(response.data.message || 'Permission berhasil disimpan.');
            navigate('/settings/permissions');
        } catch (error) {
            const message = error.response?.data?.message || 'Permission gagal disimpan.';
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

    if (loading) {
        return (
            <div className="p-6 sm:p-8">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <p className="text-sm text-gray-500">Memuat data permission...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <Link to="/settings/permissions" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    <Icon icon={Icons.back} width={16} />
                    Kembali ke daftar permission
                </Link>

                <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                    {isEdit ? 'Edit Permission' : 'Tambah Permission'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                    Gunakan format sederhana `module.action`. Sistem akan menyimpan keduanya sebagai satu nama permission.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <form onSubmit={savePermission} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">Module</span>
                            <input
                                type="text"
                                value={form.module}
                                onChange={(event) => setForm((current) => ({ ...current, module: event.target.value }))}
                                placeholder="contoh: standard"
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">Action</span>
                            <input
                                type="text"
                                value={form.action}
                                onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))}
                                placeholder="contoh: approve"
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                        </label>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Preview Permission</div>
                        <div className="mt-2 text-sm font-semibold text-gray-900">{previewName}</div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={submitting ? Icons.refresh : Icons.save} width={18} className={submitting ? 'animate-spin' : ''} />
                            {isEdit ? 'Simpan Perubahan' : 'Buat Permission'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
