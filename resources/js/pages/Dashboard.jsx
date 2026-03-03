import React from 'react';
import { useSelector } from 'react-redux';

export default function Dashboard() {
    const user = useSelector((state) => state.auth.user);


    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">Dashboard Eksekutif</h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-2 dark:text-white">Selamat datang, {user?.name}!</h2>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Unit Organisasi</p>
                        <p className="font-medium dark:text-white">{user?.unit?.name || 'Tidak ada unit'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Role Anda</p>
                        <p className="font-medium dark:text-white">{user?.roles?.join(', ') || '-'}</p>
                    </div>
                </div>

                <div className="mt-8 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Fase 6: Dashboard Analytic IKU Akan di-deploy di Sprint 16.
                    </p>
                </div>
            </div>
        </div>
    );
}
