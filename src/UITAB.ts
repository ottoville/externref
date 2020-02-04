import { LazyEval } from "./LazyEval.js";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}
export abstract class UITAB {
    public activated: boolean = false;
    abstract activate: () => void;
    //abstract deactivate: () => void;
    public deactivate () {
        this.listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                this.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
        });
    }

    public listeners: Map<
        keyof HTMLElementEventMap,
        Map<(ev: any) => any, ((e) => void) | null>
    > = new Map();
    abstract canvas: HTMLCanvasElement;
    public getInstance() {
        return this;
    }
    public addListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: UITAB | HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, options?: addListenerOptions) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e) => void) | null> | undefined;
        if (!(map = this.listeners.get(type))) {
            map = new Map();
            this.listeners.set(type, map);
        }
        if (options && options.once) {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            let proxyf = (e) => {
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
            let lazytimer;
            if (options && (lazytimer = options.lazy)) {
                let lazyf = new LazyEval((e) => {
                    listener.call(this.canvas, e);
                });
                let proxyf = (e) => {
                    lazyf.eval(lazytimer, e);
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
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e) => void) | null> | undefined;
        if (map = this.listeners.get(type)) {
            this.canvas.removeEventListener(type, map.get(listener) || listener);
            if (!map.delete(listener))
                console.warn('Tried to remove listener that did not exists:', type);
        }
    }
}