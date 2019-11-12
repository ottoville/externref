var CACHE_NAME = 'terrasim-v1';
var urlsToCache = [
    '/',
    '_framework/wasm/mono.wasm',
    '_framework/_bin/mscorlib.dll',
    '_framework/_bin/System.Core.dll',
    '_framework/_bin/System.Text.Json.dll'
];
((service: ServiceWorkerGlobalScope): void => {
    service.addEventListener('install', function (event) {
        console.log('installing serviceworker')
        // Perform install steps
        let shaders = fetch('/shaders/shaders.json').then(s => s.json());
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => 
            shaders.then(jsondata => {
                    for (var file in jsondata) {
                        cache.put(new Request('/shaders/' + file), new Response(jsondata[file]));
                    }
                    return cache.addAll(urlsToCache);
                })
            )
        );
    });
    service.addEventListener('activate', event => {
        console.log('now ready to handle fetches!');
    });
    service.addEventListener('fetch', function (event) {
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                }
                )
        );
    });
})(self as any);