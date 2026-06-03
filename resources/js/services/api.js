import axios from 'axios';
import { toast } from 'react-toastify';
import { authActions, getAuthState } from './authStore';
import {
    canQueueRequest,
    enqueueOfflineRequest,
} from './offlineQueue';

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
let hasShownOfflineActionToast = false;
const responseCache = new Map();

function buildCacheKey(url, config = {}) {
    const params = config?.params ? JSON.stringify(config.params) : '';
    return `${url}::${params}`;
}

function cloneCachedResponse(response) {
    return {
        ...response,
        data: response?.data,
    };
}

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        if (isOffline && canQueueRequest(config)) {
            enqueueOfflineRequest(config);

            const queuedError = new Error('Perubahan disimpan sementara dan akan dikirim otomatis saat koneksi kembali online.');
            queuedError.code = 'OFFLINE_QUEUED';
            queuedError.isOfflineQueued = true;
            queuedError.response = {
                status: 202,
                data: {
                    status: 'queued',
                    message: 'Perubahan disimpan sementara dan akan dikirim otomatis saat koneksi kembali online.',
                },
            };

            return Promise.reject(queuedError);
        }

        const token = getAuthState().token;
        if (token) {
            hasShownSessionExpiredToast = false;
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (String(config.method || 'get').toLowerCase() === 'get') {
            config.headers['Cache-Control'] = 'no-cache';
            config.headers.Pragma = 'no-cache';
        }

        // Let the browser set multipart boundaries automatically.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: clear cached reads after successful mutations.
api.interceptors.response.use(
    (response) => {
        const method = response.config?.method?.toLowerCase();

        if (method && method !== 'get' && method !== 'head') {
            responseCache.clear();
        }

        return response;
    },
    (error) => {
        const isOfflineError = !navigator.onLine || (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error'));

        if (isOfflineError) {
            if (!hasShownOfflineActionToast) {
                hasShownOfflineActionToast = true;
                toast.error('Anda masih offline. Permintaan data atau upload belum dapat diproses.', {
                    toastId: 'offline-action-error',
                });
            }

            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401) {
            const hasToken = Boolean(getAuthState().token);

            if (hasToken && !hasShownSessionExpiredToast) {
                hasShownSessionExpiredToast = true;
                toast.error('Sesi habis, harap login kembali');
            }

            authActions.logout();
        }
        return Promise.reject(error);
    }
);

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        hasShownOfflineActionToast = false;
    });
}

export async function getCached(url, config = {}, options = {}) {
    const ttlMs = options.ttlMs ?? 30000;
    const key = buildCacheKey(url, config);
    const now = Date.now();
    const cached = responseCache.get(key);

    if (!options.force && cached) {
        if (cached.promise) {
            return cached.promise;
        }

        if (cached.expiresAt > now) {
            return Promise.resolve(cloneCachedResponse(cached.response));
        }
    }

    const promise = api.get(url, config)
        .then((response) => {
            responseCache.set(key, {
                response,
                expiresAt: Date.now() + ttlMs,
            });

            return cloneCachedResponse(response);
        })
        .catch((error) => {
            responseCache.delete(key);
            throw error;
        });

    responseCache.set(key, {
        promise,
        expiresAt: now + ttlMs,
    });

    return promise;
}

export function invalidateCachedGet(urlPrefix) {
    for (const key of responseCache.keys()) {
        if (key.startsWith(`${urlPrefix}::`) || key === urlPrefix) {
            responseCache.delete(key);
        }
    }
}

export default api;
