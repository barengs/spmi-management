import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/authSlice';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

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
            // Auto logout if 401
            store.dispatch(logout());
        }
        return Promise.reject(error);
    }
);

export default api;
