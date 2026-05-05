const STORAGE_KEY = 'espmi_offline_queue';
const EVENT_NAME = 'espmi-offline-queue-changed';

let isFlushing = false;

function isBrowser() {
    return typeof window !== 'undefined';
}

function loadQueue() {
    if (!isBrowser()) {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveQueue(queue) {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: {
            count: queue.length,
            queue,
        },
    }));
}

export function getOfflineQueue() {
    return loadQueue();
}

export function getOfflineQueueCount() {
    return loadQueue().length;
}

export function subscribeOfflineQueue(listener) {
    if (!isBrowser()) {
        return () => {};
    }

    const handleChange = (event) => {
        listener(event.detail?.count ?? getOfflineQueueCount(), event.detail?.queue ?? getOfflineQueue());
    };

    window.addEventListener(EVENT_NAME, handleChange);

    return () => {
        window.removeEventListener(EVENT_NAME, handleChange);
    };
}

export function canQueueRequest(config = {}) {
    const method = String(config.method || 'get').toLowerCase();
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);

    if (!isMutation || config.__skipOfflineQueue || config.offlineQueue === false) {
        return false;
    }

    const url = String(config.url || '');
    if (
        url.includes('/auth/login')
        || url.includes('/auth/logout')
        || url.includes('/auth/refresh')
    ) {
        return false;
    }

    const payload = config.data;

    if (
        (typeof FormData !== 'undefined' && payload instanceof FormData)
        || (typeof Blob !== 'undefined' && payload instanceof Blob)
        || (typeof File !== 'undefined' && payload instanceof File)
        || (typeof ArrayBuffer !== 'undefined' && payload instanceof ArrayBuffer)
    ) {
        return false;
    }

    return true;
}

export function enqueueOfflineRequest(config = {}) {
    const queue = loadQueue();
    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        method: String(config.method || 'post').toLowerCase(),
        url: config.url,
        data: config.data ?? null,
        params: config.params ?? null,
        created_at: new Date().toISOString(),
    };

    queue.push(item);
    saveQueue(queue);

    return item;
}

function isNetworkFailure(error) {
    return !error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !navigator.onLine);
}

export async function flushOfflineQueue(api, { onSuccess, onPermanentFailure } = {}) {
    if (!isBrowser() || !navigator.onLine || isFlushing) {
        return { flushed: 0, failed: 0, remaining: getOfflineQueueCount() };
    }

    const queue = loadQueue();

    if (queue.length === 0) {
        return { flushed: 0, failed: 0, remaining: 0 };
    }

    isFlushing = true;

    let flushed = 0;
    let failed = 0;
    const remaining = [...queue];

    try {
        while (remaining.length > 0) {
            const current = remaining[0];

            try {
                await api.request({
                    method: current.method,
                    url: current.url,
                    data: current.data,
                    params: current.params,
                    __skipOfflineQueue: true,
                });

                remaining.shift();
                saveQueue(remaining);
                flushed += 1;
            } catch (error) {
                if (isNetworkFailure(error)) {
                    break;
                }

                remaining.shift();
                saveQueue(remaining);
                failed += 1;

                if (typeof onPermanentFailure === 'function') {
                    onPermanentFailure(current, error);
                }
            }
        }
    } finally {
        isFlushing = false;
    }

    if (flushed > 0 && typeof onSuccess === 'function') {
        onSuccess(flushed);
    }

    return {
        flushed,
        failed,
        remaining: remaining.length,
    };
}
