import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from './components/MainApp';

const container = document.getElementById('app');
if (container) {
    createRoot(container).render(
        <React.StrictMode>
            <MainApp />
        </React.StrictMode>
    );
}

