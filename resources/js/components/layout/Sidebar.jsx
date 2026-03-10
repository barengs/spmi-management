import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Icon, { Icons } from '../ui/Icon';

export default function Sidebar({ isOpen, setIsOpen }) {
    const roles = useSelector((state) => state.auth.user?.roles || []);
    const permissions = useSelector((state) => state.auth.user?.permissions || []);

    // Menu items based on capabilities/roles
    const menuItems = [
        { label: 'Dashboard', path: '/', icon: Icons.dashboard },
        { label: 'Penetapan Standar', path: '/standards', icon: Icons.standard, roles: ['SuperAdmin', 'LPM-Admin', 'Auditor', 'Auditee', 'Pimpinan'] },
        { label: 'Pelaksanaan', path: '/execution', icon: Icons.execution, roles: ['SuperAdmin', 'LPM-Admin', 'Auditee'] },
        { label: 'Audit (AMI)', path: '/audit', icon: Icons.audit, roles: ['SuperAdmin', 'LPM-Admin', 'Auditor'] },
        { label: 'Tindak Koreksi', path: '/ptk', icon: Icons.ptk, roles: ['SuperAdmin', 'LPM-Admin', 'Auditor', 'Auditee'] },
        { label: 'Report Eksekutif', path: '/report', icon: Icons.report, roles: ['SuperAdmin', 'LPM-Admin', 'Pimpinan'] },
        { label: 'Pengaturan Sistem', path: '/settings', icon: Icons.settings, permissions: ['role.manage'] },
    ];

    // Filter menu items based on user role
    const authorizedMenu = menuItems.filter(item => {
        const hasRoleAccess = !item.roles || item.roles.some(role => roles.includes(role));
        const hasPermissionAccess = roles.includes('SuperAdmin')
            || !item.permissions
            || item.permissions.some(permission => permissions.includes(permission));

        return hasRoleAccess && hasPermissionAccess;
    });

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
                                end={item.path === '/'}
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
                    </nav>
                </div>
            </div>
        </>
    );
}
