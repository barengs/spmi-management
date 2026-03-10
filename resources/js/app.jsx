import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from './components/MainApp';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

const container = document.getElementById('app');
if (container) {
    createRoot(container).render(
        <React.StrictMode>
            <MainApp />
        </React.StrictMode>
    );
}
