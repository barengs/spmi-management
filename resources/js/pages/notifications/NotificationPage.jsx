import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import { buildNotifications } from '../../utils/notifications';

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

const toneStyles = {
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export default function NotificationPage() {
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];
    const roleNames = roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);
    const [schedules, setSchedules] = useState([]);
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const hasRole = (roleName) => roleNames.includes(roleName);
    const canAccessNotifications = hasRole('SuperAdmin')
        || permissions.includes('standard.publish')
        || permissions.includes('audit.view')
        || permissions.includes('audit.score.update');

    useEffect(() => {
        if (!canAccessNotifications) {
            setSchedules([]);
            setStandards([]);
            setLoading(false);
            return undefined;
        }

        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const requests = [api.get('/standards')];

                if (hasRole('SuperAdmin') || permissions.includes('audit.view') || permissions.includes('audit.score.update')) {
                    requests.unshift(api.get('/audit-schedules'));
                }

                const responses = await Promise.all(requests);
                const standardResponse = responses[responses.length - 1];
                const scheduleResponse = responses.length > 1 ? responses[0] : null;

                setSchedules(scheduleResponse?.data?.data || []);
                setStandards(standardResponse.data.data || []);
            } catch (error) {
                setSchedules([]);
                setStandards([]);
                toast.error(error.response?.data?.message || 'Notifikasi gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [canAccessNotifications, permissions, roleNames]);

    const notifications = useMemo(
        () => buildNotifications(user, schedules, standards),
        [schedules, standards, user]
    );
    const filteredNotifications = useMemo(() => (
        notifications.filter((item) => (
            `${item.title} ${item.message}`.toLowerCase().includes(search.trim().toLowerCase())
        ))
    ), [notifications, search]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    <Icon icon={Icons.bell} width={14} />
                    Notifikasi
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Daftar Notifikasi</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Halaman ini menampilkan seluruh notifikasi masuk yang terkait dengan jadwal audit dan persetujuan yang perlu ditindaklanjuti.
                </p>
            </section>

            {!canAccessNotifications && (
                <section className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                    Role Anda tidak memiliki fitur notifikasi audit atau approval standar.
                </section>
            )}

            {canAccessNotifications && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">Cari Notifikasi</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari judul atau isi notifikasi..."
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </label>
            </section>
            )}

            {canAccessNotifications && (
            <section className="space-y-4">
                {loading ? (
                    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                        Memuat notifikasi...
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                        Belum ada notifikasi masuk.
                    </div>
                ) : (
                    filteredNotifications.map((item) => (
                        <article
                            key={item.id}
                            onClick={() => navigate(item.href)}
                            className={`cursor-pointer rounded-3xl border px-6 py-5 shadow-sm transition hover:opacity-95 ${toneStyles[item.tone] || 'border-gray-200 bg-white text-gray-900'}`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold">{item.title}</h2>
                                    <p className="mt-2 text-sm leading-6">{item.message}</p>
                                    <div className="mt-3 text-xs opacity-80">
                                        {formatDateTime(item.created_at)}
                                    </div>
                                </div>
                                <Link
                                    to={item.href}
                                    onClick={(event) => event.stopPropagation()}
                                    className="inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/60"
                                >
                                    <Icon icon={Icons.eye} width={16} />
                                    Lihat Detail
                                </Link>
                            </div>
                        </article>
                    ))
                )}
            </section>
            )}
        </div>
    );
}
