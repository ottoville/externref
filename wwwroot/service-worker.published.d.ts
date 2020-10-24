declare const cacheNamePrefix = "offline-cache-";
declare const cacheName: string;
declare const offlineAssetsInclude: RegExp[];
declare const offlineAssetsExclude: RegExp[];
declare function onInstall(event: any): Promise<void>;
declare function onActivate(event: any): Promise<void>;
declare function onFetch(event: any): Promise<Response>;
