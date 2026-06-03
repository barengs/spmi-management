import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from './components/MainApp';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const hadController = Boolean(navigator.serviceWorker.controller);

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hadController && !sessionStorage.getItem('espmi_sw_reloaded')) {
                sessionStorage.setItem('espmi_sw_reloaded', '1');
                window.location.reload();
            }
        });

        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                window.setTimeout(() => {
                    sessionStorage.removeItem('espmi_sw_reloaded');
                }, 5000);

                return registration.update();
            })
            .catch((error) => {
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
