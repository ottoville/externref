var CACHE_NAME = 'terrasim-v1';
var urlsToCache = [
    '/',
    '/shaders/shaders.json',
];
((service) => {
    service.addEventListener('install', function (event) {
        // Perform install steps
        event.waitUntil(caches.open(CACHE_NAME)
            .then(function (cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        }));
    });
    service.addEventListener('fetch', function (event) {
        console.log(event);
        event.respondWith(caches.match(event.request)
            .then(function (response) {
            // Cache hit - return response
            if (response) {
                return response;
            }
            return fetch(event.request);
        }));
    });
})(self);
//# sourceMappingURL=sw.js.map