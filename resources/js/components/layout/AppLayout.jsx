import React, { useEffect, useRef, useState } from 'react';
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('espmi_sidebar_collapsed') === '1');
    const [connectionStatus, setConnectionStatus] = useState(() => (window.navigator.onLine ? 'connected' : 'offline'));
    const connectionStatusRef = useRef(connectionStatus);
    const [pendingQueueCount, setPendingQueueCount] = useState(() => getOfflineQueueCount());

    // Activate global session tracking and refresh logic
    useSessionManager();

    useEffect(() => {
        localStorage.setItem('espmi_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    }, [sidebarCollapsed]);

    useEffect(() => {
        const unsubscribe = subscribeOfflineQueue((count) => {
            setPendingQueueCount(count);
        });

        const updateConnectionStatus = (status) => {
            connectionStatusRef.current = status;
            setConnectionStatus(status);
        };

        const syncOfflineQueue = () => {
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

        const checkServerConnection = async ({ notifyRecovery = false } = {}) => {
            if (!window.navigator.onLine) {
                updateConnectionStatus('offline');
                return;
            }

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 5000);

            try {
                const response = await fetch('/up', {
                    cache: 'no-store',
                    headers: {
                        Accept: 'text/html',
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    updateConnectionStatus('server-down');
                    return;
                }

                const previousStatus = connectionStatusRef.current;
                updateConnectionStatus('connected');

                if (previousStatus !== 'connected') {
                    if (notifyRecovery) {
                        toast.success('Koneksi ke server kembali tersedia.', {
                            toastId: 'network-online',
                        });
                    }
                    syncOfflineQueue();
                }
            } catch {
                updateConnectionStatus(window.navigator.onLine ? 'server-down' : 'offline');
            } finally {
                window.clearTimeout(timeoutId);
            }
        };

        const handleOffline = () => {
            updateConnectionStatus('offline');
            toast.warning('Anda sedang offline. Halaman saat ini tetap bisa diakses, tetapi fetch data dan upload belum dapat dilakukan.', {
                toastId: 'network-offline',
            });
        };

        const handleOnline = () => {
            checkServerConnection({ notifyRecovery: true });
        };

        checkServerConnection();
        const healthCheckInterval = window.setInterval(checkServerConnection, 30000);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            unsubscribe();
            window.clearInterval(healthCheckInterval);
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
                isCollapsed={sidebarCollapsed}
                setIsCollapsed={setSidebarCollapsed}
                connectionStatus={connectionStatus}
                pendingQueueCount={pendingQueueCount}
            />

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

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
