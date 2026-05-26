import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { updateUser } from '../../store/authSlice';
import Icon, { Icons } from '../../components/ui/Icon';

function formatFileSize(value) {
    if (!value || Number(value) <= 0) {
        return '-';
    }

    const size = Number(value);

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AccountPage() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileSubmitting, setProfileSubmitting] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [signatureSubmitting, setSignatureSubmitting] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState(null);
    const [signatureLoading, setSignatureLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const signatureMeta = user?.signature || {};

    useEffect(() => {
        setProfileName(user?.name || '');
    }, [user?.name]);

    useEffect(() => {
        if (!signatureMeta?.has_file) {
            setSignatureUrl((current) => {
                if (current) {
                    URL.revokeObjectURL(current);
                }

                return null;
            });
            return undefined;
        }

        let isMounted = true;
        let nextUrl = null;

        const fetchSignature = async () => {
            try {
                setSignatureLoading(true);
                const response = await api.get('/auth/signature/download', {
                    responseType: 'blob',
                });

                if (!isMounted) {
                    return;
                }

                nextUrl = URL.createObjectURL(response.data);
                setSignatureUrl((current) => {
                    if (current) {
                        URL.revokeObjectURL(current);
                    }

                    return nextUrl;
                });
            } catch (error) {
                if (isMounted) {
                    setSignatureUrl(null);
                }
            } finally {
                if (isMounted) {
                    setSignatureLoading(false);
                }
            }
        };

        fetchSignature();

        return () => {
            isMounted = false;

            if (nextUrl) {
                URL.revokeObjectURL(nextUrl);
            }
        };
    }, [signatureMeta?.has_file, signatureMeta?.original_name, signatureMeta?.size_bytes]);

    const canSaveProfile = useMemo(() => profileName.trim().length > 0 && profileName.trim() !== (user?.name || ''), [profileName, user?.name]);

    const handleProfileSubmit = async (event) => {
        event.preventDefault();

        try {
            setProfileSubmitting(true);
            const response = await api.put('/auth/profile', {
                name: profileName.trim(),
            });
            dispatch(updateUser(response.data.data));
            toast.success(response.data.message || 'Nama akun berhasil diperbarui.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Nama akun gagal diperbarui.');
        } finally {
            setProfileSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();

        try {
            setPasswordSubmitting(true);
            const response = await api.put('/auth/password', passwordForm);
            setPasswordForm({
                current_password: '',
                password: '',
                password_confirmation: '',
            });
            toast.success(response.data.message || 'Password berhasil diperbarui.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Password gagal diperbarui.');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const handleSignatureChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const payload = new FormData();
        payload.append('signature', file);

        try {
            setSignatureSubmitting(true);
            const response = await api.post('/auth/signature', payload);
            dispatch(updateUser(response.data.data));
            toast.success(response.data.message || 'Tanda tangan virtual berhasil diperbarui.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Tanda tangan virtual gagal diperbarui.');
        } finally {
            setSignatureSubmitting(false);
            event.target.value = '';
        }
    };

    const handleSignatureDelete = async () => {
        try {
            setSignatureSubmitting(true);
            const response = await api.delete('/auth/signature');
            dispatch(updateUser(response.data.data));
            toast.success(response.data.message || 'Tanda tangan virtual berhasil dihapus.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Tanda tangan virtual gagal dihapus.');
        } finally {
            setSignatureSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Akun Saya</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Kelola nama akun, password, dan tanda tangan virtual Anda sendiri.
                </p>
            </div>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <form onSubmit={handleProfileSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            <Icon icon={Icons.edit} width={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profil Akun</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nama dapat diubah langsung tanpa akses admin.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Akun</span>
                            <input
                                type="text"
                                value={profileName}
                                onChange={(event) => setProfileName(event.target.value)}
                                disabled={profileSubmitting}
                                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                            />
                        </label>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Email</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user?.email || '-'}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Role</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                {(user?.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean).join(', ') || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={!canSaveProfile || profileSubmitting}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={Icons.save} width={18} />
                            Simpan Nama
                        </button>
                    </div>
                </form>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Icon icon={Icons.document} width={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tanda Tangan Virtual</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unggah file PNG/JPG/WEBP untuk dipakai sebagai tanda tangan akun.</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/50">
                        {signatureLoading ? (
                            <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Memuat tanda tangan...</div>
                        ) : signatureUrl ? (
                            <div className="space-y-4">
                                <div className="flex min-h-40 items-center justify-center rounded-2xl bg-white p-4 dark:bg-gray-950">
                                    <img src={signatureUrl} alt="Tanda tangan virtual" className="max-h-36 w-auto object-contain" />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {signatureMeta.original_name || 'signature'} • {formatFileSize(signatureMeta.size_bytes)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Icon icon={Icons.document} width={28} />
                                <span>Belum ada tanda tangan virtual.</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                            <Icon icon={Icons.add} width={18} />
                            {signatureMeta.has_file ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleSignatureChange}
                                disabled={signatureSubmitting}
                            />
                        </label>
                        {signatureMeta.has_file && (
                            <button
                                type="button"
                                onClick={handleSignatureDelete}
                                disabled={signatureSubmitting}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300"
                            >
                                <Icon icon={Icons.delete} width={18} />
                                Hapus
                            </button>
                        )}
                    </div>
                </section>
            </section>

            <form onSubmit={handlePasswordSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <Icon icon={Icons.locked} width={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ubah Password</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Gunakan password minimal 8 karakter.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Saat Ini</span>
                        <input
                            type="password"
                            value={passwordForm.current_password}
                            onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                            disabled={passwordSubmitting}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-amber-900/40"
                        />
                    </label>
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Baru</span>
                        <input
                            type="password"
                            value={passwordForm.password}
                            onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                            disabled={passwordSubmitting}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-amber-900/40"
                        />
                    </label>
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Konfirmasi Password Baru</span>
                        <input
                            type="password"
                            value={passwordForm.password_confirmation}
                            onChange={(event) => setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))}
                            disabled={passwordSubmitting}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-amber-900/40"
                        />
                    </label>
                </div>

                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={passwordSubmitting}
                        className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Icon icon={Icons.locked} width={18} />
                        Simpan Password
                    </button>
                </div>
            </form>
        </div>
    );
}
