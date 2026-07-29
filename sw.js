const CACHE_VERSION = 'ambo-v7.0.0-home';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const APP_SHELL = [
    '/',
    '/index.html',
    '/styles.css',
    '/ambo-core.js',
    '/config.js',
    '/script.js',
    '/manifest.webmanifest',
    '/favicon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/data/snapshots/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key.startsWith('ambo-') && ![STATIC_CACHE, DATA_CACHE].includes(key))
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request, fallbackUrl = null) {
    const cache = await caches.open(STATIC_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(DATA_CACHE);
    const cached = await cache.match(request);
    const update = fetch(request)
        .then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);
    return cached || (await update) || Response.error();
}

async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, '/index.html'));
        return;
    }

    if (url.pathname.startsWith('/data/')) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

    if (/\.(?:css|js)$/.test(url.pathname)) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (/\.(?:png|svg|webmanifest)$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
    }
});
