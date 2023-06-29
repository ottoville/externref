// Caution! Be sure you understand the caveats before publishing an application with
// offline support. See https://aka.ms/blazor-offline-considerations

((service: ServiceWorkerGlobalScope): void => {
    service.addEventListener('install',
        event =>
            event.waitUntil(onInstall()));
    service.addEventListener('activate',
        event =>
            event.waitUntil(onActivate()));
    service.addEventListener('fetch',
        event =>
            event.respondWith(onFetch(event)));
})(self as unknown as ServiceWorkerGlobalScope);

const cacheNamePrefix = 'offline-cache-';

const cacheName = `${cacheNamePrefix}v1`;

// eslint-disable-next-line require-await
async function onInstall() {
    console.info('Service worker: Install');
    return;
}

async function onActivate() {
    console.info('Service worker: Activate');

    // Delete unused caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key =>
            key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key =>
            caches.delete(key)));
}

async function onFetch(event: FetchEvent) {
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        // For all navigation requests, try to serve index.html from cache
        // If you need some URLs to be server-rendered, edit the following check to exclude those URLs
        const shouldServeIndexHtml = event.request.mode === 'navigate';

        const request = shouldServeIndexHtml ? 'index.html' : event.request;
        const cache = await caches.open(cacheName);
        //@ts-ignore
        cachedResponse = await cache.match(request);
    }

    return cachedResponse || fetch(event.request);
}
