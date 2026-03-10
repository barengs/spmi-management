const CACHE_VERSION = 'espmi-v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const APP_SHELL_FILES = ['/', '/offline.html', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES)),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key)),
            ),
        ),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, '/offline.html'));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl) {
    const cache = await caches.open(RUNTIME_CACHE);

    try {
        const response = await fetch(request);
        cache.put(request, response.clone());

        return response;
    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        const fallbackResponse = await caches.match(fallbackUrl);

        if (fallbackResponse) {
            return fallbackResponse;
        }

        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    const networkResponsePromise = fetch(request)
        .then((response) => {
            cache.put(request, response.clone());

            return response;
        })
        .catch(() => null);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse = await networkResponsePromise;

    if (networkResponse) {
        return networkResponse;
    }

    return caches.match('/offline.html');
}
