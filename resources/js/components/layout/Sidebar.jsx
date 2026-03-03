import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function Sidebar({ isOpen, setIsOpen }) {
    const roles = useSelector((state) => state.auth.user?.roles || []);

    // Menu items based on capabilities/roles
    const menuItems = [
        { label: 'Dashboard', path: '/', icon: '📊' },
        { label: 'Penetapan Standar', path: '/standards', icon: '📝', roles: ['SuperAdmin', 'LPM-Admin', 'Auditor', 'Auditee', 'Pimpinan'] },
        { label: 'Pelaksanaan', path: '/execution', icon: '📂', roles: ['SuperAdmin', 'LPM-Admin', 'Auditee'] },
        { label: 'Audit (AMI)', path: '/audit', icon: '🔍', roles: ['SuperAdmin', 'LPM-Admin', 'Auditor'] },
        { label: 'Tindak Koreksi', path: '/ptk', icon: '🛠️', roles: ['SuperAdmin', 'LPM-Admin', 'Auditor', 'Auditee'] },
        { label: 'Report Eksekutif', path: '/report', icon: '📈', roles: ['SuperAdmin', 'LPM-Admin', 'Pimpinan'] },
        { label: 'Pengaturan Sistem', path: '/settings', icon: '⚙️', roles: ['SuperAdmin'] },
    ];

    // Filter menu items based on user role
    // In a real app we'd check permissions instead, but this gives a good shell UX based on Sprint 1 setup
    const authorizedMenu = menuItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.some(role => roles.includes(role));
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
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        E-SPMI 🌿
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
                                <span className="mr-3 text-lg">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>
        </>
    );
}
