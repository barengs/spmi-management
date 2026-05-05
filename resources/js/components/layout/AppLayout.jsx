import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import LockScreen from '../auth/LockScreen';
import useSessionManager from '../../hooks/useSessionManager';
import { flushOfflineQueue, getOfflineQueueCount, subscribeOfflineQueue } from '../../services/offlineQueue';
import api from '../../services/api';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
    const [pendingQueueCount, setPendingQueueCount] = useState(() => getOfflineQueueCount());

    // Activate global session tracking and refresh logic
    useSessionManager();

    useEffect(() => {
        const unsubscribe = subscribeOfflineQueue((count) => {
            setPendingQueueCount(count);
        });

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('Anda sedang offline. Halaman saat ini tetap bisa diakses, tetapi fetch data dan upload belum dapat dilakukan.', {
                toastId: 'network-offline',
            });
        };

        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Koneksi kembali online.', {
                toastId: 'network-online',
            });
            flushOfflineQueue(api, {
                onSuccess: (count) => {
                    toast.success(`${count} perubahan offline berhasil disinkronkan.`, {
                        toastId: 'offline-sync-success',
                    });
                },
                onPermanentFailure: () => {
                    toast.warning('Ada perubahan offline yang gagal diproses dan dilewati karena data sudah tidak valid.', {
                        toastId: 'offline-sync-failure',
                    });
                },
            });
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            unsubscribe();
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100 font-sans">
            <LockScreen />
            {/* Sidebar Navigation */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isOnline={isOnline}
                pendingQueueCount={pendingQueueCount}
            />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-64 overflow-hidden">

                {/* Header Navbar */}
                <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto">
                    {/* React Router injects matched child routes here */}
                    <div className="w-full mx-auto max-w-7xl animate-fade-in-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
