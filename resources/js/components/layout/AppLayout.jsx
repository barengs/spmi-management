import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100 font-sans">
            {/* Sidebar Navigation */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

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
