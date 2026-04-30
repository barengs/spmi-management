import axios from 'axios';
import { toast } from 'react-toastify';
import { store } from '../store';
import { logout } from '../store/authSlice';

const apiBaseUrl = (
    import.meta.env.VITE_API_BASE_URL
    || '/api/v1'
).replace(/\/+$/, '');

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

let hasShownSessionExpiredToast = false;

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        const token = store.getState().auth.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Let the browser set multipart boundaries automatically.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const hasToken = Boolean(store.getState().auth.token);

            if (hasToken && !hasShownSessionExpiredToast) {
                hasShownSessionExpiredToast = true;
                toast.error('Sesi habis, harap login kembali');
            }

            store.dispatch(logout());
        }
        return Promise.reject(error);
    }
);

store.subscribe(() => {
    if (store.getState().auth.token) {
        hasShownSessionExpiredToast = false;
    }
});

export default api;
