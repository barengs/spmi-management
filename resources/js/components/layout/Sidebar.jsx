import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Icon, { Icons } from '../ui/Icon';

export default function Sidebar({
    isOpen,
    setIsOpen,
    isCollapsed = false,
    setIsCollapsed,
    connectionStatus = 'connected',
    pendingQueueCount = 0,
}) {
    const roles = useSelector((state) => state.auth.user?.roles || []);
    const permissions = useSelector((state) => state.auth.user?.permissions || []);
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));

    // Menu items based on capabilities/roles
    const [masterOpen, setMasterOpen] = useState(true);

    const menuItems = [
        { label: 'Dashboard', path: '/', icon: Icons.dashboard },
        { label: 'Borang', path: '/borang', icon: Icons.document, permissions: ['standard.update', 'audit.score.update', 'audit.view'] },
        { label: 'Pelaksanaan', path: '/pelaksanaan', icon: Icons.execution, permissions: ['standard.update', 'audit.score.update', 'audit.view'] },
        { label: 'Standar', path: '/standards', icon: Icons.standard, permissions: ['standard.view', 'standard.create', 'standard.update', 'standard.publish', 'report.export'], hideRoles: ['Auditor', 'Lead Auditor'] },
        { label: 'Jadwal Audit', path: '/audit/schedules', icon: Icons.schedule, permissions: ['audit.view'], hideRoles: ['Wakil Rektor 1', 'Wakil Rektor 2', 'Wakil Rektor 3', 'Rektor'] },
        { label: 'Audit (AMI)', path: '/audit', icon: Icons.audit, permissions: ['audit.score.update'] },
        { label: 'Tindak Koreksi', path: '/ptk', icon: Icons.ptk, roles: ['Auditor'], permissions: ['ptk.view'] },
        { label: 'Laporan Audit', path: '/report', icon: Icons.report, permissions: ['report.view'], hideRoles: ['Wakil Rektor 1', 'Wakil Rektor 2', 'Wakil Rektor 3', 'Rektor'] },
    ];

    const masterItems = [
        { label: 'Fakultas', path: '/settings/master/faculties', icon: Icons.folder, roles: ['SuperAdmin'], permissions: ['user.view'] },
        { label: 'Prodi', path: '/settings/master/prodis', icon: Icons.document, roles: ['SuperAdmin'], permissions: ['user.view'] },
        { label: 'Pengaturan Siklus', path: '/settings/cycle', icon: Icons.schedule, roles: ['SuperAdmin'], permissions: ['role.manage'] },
        { label: 'Manajemen Pengguna', path: '/settings/users', icon: Icons.shield, roles: ['SuperAdmin'], permissions: ['user.view'] },
        { label: 'Manajemen Role', path: '/settings', icon: Icons.settings, roles: ['SuperAdmin'], permissions: ['role.manage'] },
        { label: 'Manajemen Permission', path: '/settings/permissions', icon: Icons.target, roles: ['SuperAdmin'], permissions: ['role.manage'] },
    ];

    // Filter menu items based on user role
    const authorizedMenu = menuItems.filter(item => {
        if (item.visible === false) {
            return false;
        }

        const isHiddenForRole = item.hideRoles?.some(role => hasRole(role));
        const hasRoleAccess = !item.roles || item.roles.some(role => hasRole(role));
        const hasPermissionAccess = hasRole('SuperAdmin')
            || !item.permissions
            || item.permissions.some(permission => permissions.includes(permission));

        return !isHiddenForRole && hasRoleAccess && hasPermissionAccess;
    });

    const authorizedMasterItems = useMemo(() => (
        masterItems.filter((item) => {
            const hasRoleAccess = !item.roles || item.roles.some((role) => hasRole(role));
            const hasPermissionAccess = hasRole('SuperAdmin')
                || !item.permissions
                || item.permissions.some((permission) => permissions.includes(permission));

            return hasRoleAccess && hasPermissionAccess;
        })
    ), [permissions, roles]);

    const connectionDisplay = {
        connected: {
            label: 'Online',
            description: 'Terhubung ke server',
            icon: Icons.online,
            className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        },
        offline: {
            label: 'Offline',
            description: 'Tidak ada internet',
            icon: Icons.offline,
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        },
        'server-down': {
            label: 'Server Tidak Tersedia',
            description: 'Gagal menghubungkan ke server, harap hubungi petugas',
            icon: Icons.offline,
            className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        },
    }[connectionStatus] || {
        label: 'Offline',
        description: 'Tidak ada internet',
        icon: Icons.offline,
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-[transform,width] duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} `}>

                <div className={`flex h-16 items-center border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? 'px-4' : 'px-6'}`}>
                    <div className="flex items-center justify-between w-full gap-3">
                        <span className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2 ${isCollapsed ? 'hidden' : ''}`}>
                            E-SPMI <Icon icon={Icons.logo} className="text-green-500" />
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsCollapsed?.((current) => !current)}
                            className={`hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-blue-300 lg:inline-flex ${isCollapsed ? 'mx-auto' : ''}`}
                            title={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                            aria-label={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                        >
                            <Icon icon={Icons.menu} width={22} />
                        </button>
                    </div>
                </div>

                <div className="flex h-[calc(100%-4rem)] flex-col">
                    <div className="flex-1 overflow-y-auto">
                    <nav className={`mt-6 space-y-2 ${isCollapsed ? 'px-3' : 'px-4'}`}>
                        {pendingQueueCount > 0 && (
                            <div className={`rounded-2xl border border-amber-200 bg-amber-50 text-xs leading-5 text-amber-900 ${isCollapsed ? 'px-2 py-2 text-center' : 'px-4 py-3'}`}>
                                {isCollapsed ? pendingQueueCount : `${pendingQueueCount} perubahan tersimpan sementara dan menunggu sinkronisasi.`}
                            </div>
                        )}

                        {authorizedMenu.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.path}
                                end={item.path === '/' || item.path === '/audit'}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center rounded-lg text-sm font-medium transition-colors ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'} ${isActive
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                                    }`
                                }
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon icon={item.icon} width={20} className={isCollapsed ? '' : 'mr-3'} />
                                {!isCollapsed && item.label}
                            </NavLink>
                        ))}

                        {authorizedMasterItems.length > 0 && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMasterOpen((current) => !current)}
                                    className={`flex w-full items-center rounded-lg py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-4'}`}
                                    title={isCollapsed ? 'Master' : undefined}
                                >
                                    <span className="flex items-center">
                                        <Icon icon={Icons.settings} width={20} className={isCollapsed ? '' : 'mr-3'} />
                                        {!isCollapsed && 'Master'}
                                    </span>
                                    {!isCollapsed && <Icon icon={masterOpen ? Icons.expand : Icons.collapse} width={18} />}
                                </button>

                                {masterOpen && !isCollapsed && (
                                    <div className="mt-1 space-y-1 pl-4">
                                        {authorizedMasterItems.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                end={item.path === '/settings' || item.path === '/settings/permissions'}
                                                onClick={() => setIsOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'
                                                    }`
                                                }
                                            >
                                                <Icon icon={item.icon} width={18} className="mr-3" />
                                                {item.label}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>
                    </div>

                    <div className={`border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? 'p-3' : 'p-4'}`}>
                        <div
                            className={`rounded-xl px-3 py-2 ${connectionDisplay.className}`}
                            title={isCollapsed ? `${connectionDisplay.label}: ${connectionDisplay.description}` : undefined}
                        >
                            <div className={`flex items-center text-xs font-semibold ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
                                <Icon icon={connectionDisplay.icon} width={16} />
                                {!isCollapsed && connectionDisplay.label}
                            </div>
                            {!isCollapsed && (
                                <div className="mt-1 text-[11px] font-medium leading-4">
                                    {connectionDisplay.description}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
