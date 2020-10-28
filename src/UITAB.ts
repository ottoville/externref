import { LazyEval } from "./LazyEval.js";
import { WorldScene } from "./world/scene.js";
import { Terrain } from "./world/terrain.js";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera.js";
import { Sea } from "./world/water.js";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}
type UITABClass = typeof UITAB;
export interface UITABClassLike extends UITABClass {
    instance: UITAB | null;
};
export abstract class UITAB {
    public static instance: UITAB | null = null;
    abstract destroy(): void;
    //abstract deactivate: () => void;
   /* public deactivate() {
        this.listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                this.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
        });
    }*/
    constructor(
        public sceneDeprecated: WorldScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea
    ) {
    }
   /* public listeners: Map<
        keyof HTMLElementEventMap,
        Map<(ev: any) => any, ((e:any) => void) | null>
    > = new Map();*/
    /*public getInstance() {
        return this;
    }*/
    /*public addListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: UITAB | HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, options?: addListenerOptions) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (!(map = this.listeners.get(type))) {
            map = new Map();
            this.listeners.set(type, map);
        }
        if (options && options.once) {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            let proxyf = (e : HTMLElementEventMap[K]) => {
                listener.call(this.canvas, e);
                map && map.delete(listener);
            };
            map.set(listener, proxyf)

            this.canvas.addEventListener(type, proxyf, options);
        } else {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            if (options && options.lazy !== undefined) {
                let lazyf = new LazyEval((e) => {
                    listener.call(this.canvas, e);
                });
                let proxyf = (e: HTMLElementEventMap[K]) => {
                    lazyf.eval(options.lazy!, e);
                };
                map.set(listener, proxyf);
                this.canvas.addEventListener(type, proxyf);
            } else {
                map.set(listener, null);
                this.canvas.addEventListener(type, listener);
            }
        }
    }
    public removeListener<K extends keyof HTMLElementEventMap>(type: K, listener: (ev: HTMLElementEventMap[K]) => any, lazy: boolean = false) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (map = this.listeners.get(type)) {
            this.canvas.removeEventListener(type, map.get(listener) || listener);
            if (!map.delete(listener))
                console.warn('Tried to remove listener that did not exists:', type);
        }
    }*/
}