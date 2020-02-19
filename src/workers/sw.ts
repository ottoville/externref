var CACHE_NAME = 'terrasim-v1';
let version = "_VERSION_";
var urlsToCache = [
    '/',
    '_framework/_bin/System.dll',
    '_framework/wasm/dotnet.wasm',
    '_framework/_bin/mscorlib.dll',
    '_framework/_bin/System.Core.dll',
    '_framework/_bin/System.Text.Json.dll'
];
let shaders: Promise<{ [key: string]:string}> = fetch('/shaders/shaders.json').then(s => s.json());
((service: ServiceWorkerGlobalScope): void => {
    service.addEventListener('install', function (event) {
        console.log('installing serviceworker')
        service.skipWaiting();
        // Perform install steps
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
        service.clients.claim();
    });
    service.addEventListener('fetch', function (event) {
        let req = event.request;
        if (event.request.destination == 'script' && event.request.url.substr(-3) !== '.js') {
            req=new Request(event.request.url+'.js')
        }
        if (event.request.url.substr(-3) == '.fx') {
            let filename = event.request.url.split('/').pop();
            req = new Request('/shaders/' + filename);
        }
        event.respondWith(
            caches.match(req).then(async function (response) {
                // Cache hit - return response
                if (response) {
                    return response;
                } else {    // Visual studio javascript debug workaround
                    let jsondata = await shaders;
                    if (jsondata[req.url]) {
                        console.log('Visual studio javascript debug workaround');
                        console.log(req);
                        return new Response(jsondata[req.url]);
                    }
                }
                return fetch(req);
            })
        );
    });
})(self as any);