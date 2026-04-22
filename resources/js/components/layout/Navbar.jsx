import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Icon, { Icons } from '../ui/Icon';
import { buildNotifications } from '../../utils/notifications';

export default function Navbar({ toggleSidebar }) {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [notificationSchedules, setNotificationSchedules] = useState([]);
    const [notificationStandards, setNotificationStandards] = useState([]);

    const getBreadcrumbs = () => {
        const path = location.pathname;

        if (path === '/') {
            return ['Dashboard'];
        }

        if (path === '/standards') {
            return ['Standar Mutu'];
        }

        if (path === '/borang') {
            return ['Borang'];
        }

        if (path === '/notifications') {
            return ['Notifikasi'];
        }

        if (/^\/standards\/[^/]+\/builder$/.test(path)) {
            return ['Standar Mutu', 'Builder Struktur'];
        }

        if (/^\/standards\/[^/]+\/review$/.test(path)) {
            return ['Standar Mutu', 'Review Standar'];
        }

        if (/^\/standards\/[^/]+\/execution$/.test(path)) {
            return ['Standar Mutu', 'Dokumen Auditee'];
        }

        if (path === '/audit') {
            return ['Audit', 'Daftar Fakultas'];
        }

        if (path === '/audit/schedules') {
            return ['Audit', 'Jadwal Audit'];
        }

        if (/^\/audit\/standards\/[^/]+\/review$/.test(path)) {
            return ['Audit', 'Review Dokumen'];
        }

        if (path === '/ptk') {
            return ['PTK'];
        }

        if (path === '/report') {
            return ['Laporan Audit'];
        }

        if (path === '/settings/users') {
            return ['Pengaturan', 'Manajemen Pengguna'];
        }

        if (path === '/settings/master/faculties') {
            return ['Master', 'Fakultas'];
        }

        if (path === '/settings/master/prodis') {
            return ['Master', 'Prodi'];
        }

        if (path === '/settings') {
            return ['Pengaturan', 'Hak Akses'];
        }

        return ['Halaman'];
    };

    const breadcrumbs = getBreadcrumbs();
    const notifications = useMemo(
        () => buildNotifications(user, notificationSchedules, notificationStandards).slice(0, 5),
        [notificationSchedules, notificationStandards, user]
    );

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [scheduleResponse, standardResponse] = await Promise.all([
                    api.get('/audit-schedules'),
                    api.get('/standards'),
                ]);

                setNotificationSchedules(scheduleResponse.data.data || []);
                setNotificationStandards(standardResponse.data.data || []);
            } catch (error) {
                setNotificationSchedules([]);
                setNotificationStandards([]);
            }
        };

        fetchNotifications();

        const intervalId = window.setInterval(fetchNotifications, 30000);
        const handleFocus = () => {
            fetchNotifications();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [location.pathname]);

    // Initialize dark mode
    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setDarkMode(true);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            toast.success('Logout berhasil! Sampai jumpa.');
        } catch (error) {
            console.error('Logout failed:', error);
            toast.error('Masalah jaringan saat logout, namun sesi lokal dihapus.');
        } finally {
            dispatch(logout());
        }
    };

    return (
        <header className="flex h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
            {/* Mobile menu button */}
            <div className="flex items-center">
                <button
                    onClick={toggleSidebar}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white lg:hidden p-2 rounded-md focus:outline-none"
                >
                    <Icon icon={Icons.menu} width={24} className="text-gray-600 dark:text-gray-300" />
                </button>

                {/* Breadcrumbs */}
                <div className="hidden sm:flex ml-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {breadcrumbs.map((item, index) => (
                        <React.Fragment key={`${item}-${index}`}>
                            {index > 0 && <span className="mx-2">&gt;</span>}
                            <span className={index === breadcrumbs.length - 1 ? 'text-gray-700 dark:text-gray-200' : ''}>
                                {item}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">

                {/* Dark mode toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-yellow-400 focus:outline-none transition-colors border border-transparent rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <Icon 
                        icon={darkMode ? Icons.sun : Icons.moon} 
                        width={20} 
                        className={darkMode ? 'text-yellow-500' : 'text-gray-600'}
                    />
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setNotificationOpen((current) => !current)}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition relative"
                    >
                        <Icon icon={Icons.bell} width={20} />
                        {notifications.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {notificationOpen && (
                        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                <div className="text-sm font-semibold text-gray-900">Notifikasi</div>
                                <Link
                                    to="/notifications"
                                    onClick={() => setNotificationOpen(false)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Lihat Semua
                                </Link>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                                        Belum ada notifikasi masuk.
                                    </div>
                                ) : (
                                    notifications.map((item) => (
                                        <Link
                                            key={item.id}
                                            to={item.href}
                                            onClick={() => setNotificationOpen(false)}
                                            className="block border-b border-gray-100 px-4 py-4 transition hover:bg-gray-50"
                                        >
                                            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                            <div className="mt-1 text-sm leading-6 text-gray-600">{item.message}</div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-2 focus:outline-none"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user?.name}
                        </span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 ring-1 ring-black ring-opacity-5 z-50">
                            <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 mb-1">
                                <div className="font-bold truncate">{user?.name}</div>
                                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                            </div>
                            <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Profil</a>
                            <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Pengaturan</Link>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-1"></div>
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 font-medium"
                            >
                                Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
