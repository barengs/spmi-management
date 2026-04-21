import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Icon, { Icons } from '../ui/Icon';

export default function Sidebar({ isOpen, setIsOpen }) {
    const roles = useSelector((state) => state.auth.user?.roles || []);
    const permissions = useSelector((state) => state.auth.user?.permissions || []);
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));

    // Menu items based on capabilities/roles
    const [masterOpen, setMasterOpen] = useState(true);

    const menuItems = [
        { label: 'Dashboard', path: '/', icon: Icons.dashboard },
        { label: 'Borang', path: '/borang', icon: Icons.document, roles: ['LPM-Admin', 'SuperAdmin'], permissions: ['standard.update'] },
        { label: 'Penetapan Standar', path: '/standards', icon: Icons.standard, permissions: ['standard.view'] },
        { label: 'Jadwal Audit', path: '/audit/schedules', icon: Icons.schedule, permissions: ['audit.view'] },
        { label: 'Audit (AMI)', path: '/audit', icon: Icons.audit, permissions: ['audit.score.update'] },
        { label: 'Tindak Koreksi', path: '/ptk', icon: Icons.ptk, permissions: ['ptk.view'] },
        { label: 'Laporan Audit', path: '/report', icon: Icons.report, permissions: ['report.view'] },
        { label: 'Manajemen Pengguna', path: '/settings/users', icon: Icons.shield, roles: ['SuperAdmin'], permissions: ['user.view'] },
    ];

    const masterItems = [
        { label: 'Fakultas', path: '/settings/master/faculties', icon: Icons.folder, roles: ['SuperAdmin'], permissions: ['user.view'] },
        { label: 'Prodi', path: '/settings/master/prodis', icon: Icons.document, roles: ['SuperAdmin'], permissions: ['user.view'] },
    ];

    // Filter menu items based on user role
    const authorizedMenu = menuItems.filter(item => {
        const hasRoleAccess = !item.roles || item.roles.some(role => hasRole(role));
        const hasPermissionAccess = hasRole('SuperAdmin')
            || !item.permissions
            || item.permissions.some(permission => permissions.includes(permission));

        return hasRoleAccess && hasPermissionAccess;
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

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} `}>

                <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-2">
                        E-SPMI <Icon icon={Icons.logo} className="text-green-500" />
                    </span>
                </div>

                <div className="overflow-y-auto h-full pb-20">
                    <nav className="mt-6 px-4 space-y-2">
                        {authorizedMenu.map((item, index) => (
                            <NavLink
                                key={index}
                                to={item.path}
                                end={item.path === '/' || item.path === '/audit'}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                                    }`
                                }
                            >
                                <Icon icon={item.icon} width={20} className="mr-3" />
                                {item.label}
                            </NavLink>
                        ))}

                        {authorizedMasterItems.length > 0 && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMasterOpen((current) => !current)}
                                    className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                >
                                    <span className="flex items-center">
                                        <Icon icon={Icons.settings} width={20} className="mr-3" />
                                        Master
                                    </span>
                                    <Icon icon={masterOpen ? Icons.expand : Icons.collapse} width={18} />
                                </button>

                                {masterOpen && (
                                    <div className="mt-1 space-y-1 pl-4">
                                        {authorizedMasterItems.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
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
            </div>
        </>
    );
}
