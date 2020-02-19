declare var CACHE_NAME: string;
declare let version: string;
declare var urlsToCache: string[];
declare let shaders: Promise<{
    [key: string]: string;
}>;
