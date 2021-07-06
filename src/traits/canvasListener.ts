import { LazyEval } from "../LazyEval.js";
import { GPU } from "../GPU.js";
import type { UITAB } from "../UITAB.js";
import { Trait } from "./trait.js";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}

export interface hasCanvasListener extends UITAB {
    canvasListener: canvasListener;
}

export class canvasListener extends Trait {
    //abstract deactivate: () => void;
    override destroy() {
        this.#listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                GPU.instance.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
        });
    }
    #listeners: Map<
        keyof HTMLElementEventMap,
        Map<(ev: any) => any, ((e: any) => void) | null>
    > = new Map();
    /*public getInstance() {
        return this;
    }*/
    public addListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: canvasListener | HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, options?: addListenerOptions) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (!(map = this.#listeners.get(type))) {
            map = new Map();
            this.#listeners.set(type, map);
        }
        if (options && options.once) {
            map.set(listener, listener);
            GPU.instance.canvas.addEventListener(type, listener, options);
        } else {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            if (options && options.lazy !== undefined) {
                const lazyf = new LazyEval((e) => {
                    listener.call(GPU.instance.canvas, e);
                });
                const proxyf = (e: HTMLElementEventMap[K]) => {
                    lazyf.eval(options.lazy!, e);
                };
                map.set(listener, proxyf);
                GPU.instance.canvas.addEventListener(type, proxyf);
            } else {
                map.set(listener, null);
                GPU.instance.canvas.addEventListener(type, listener);
            }
        }
    }
    public removeListener<K extends keyof HTMLElementEventMap>(type: K, listener: (ev: HTMLElementEventMap[K]) => any) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (map = this.#listeners.get(type)) {
            GPU.instance.canvas.removeEventListener(type, map.get(listener) || listener);
            if (!map.delete(listener))
                console.warn('Tried to remove listener that did not exists:', type);
        }
    }
}