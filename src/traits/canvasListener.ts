import { LazyEval } from "../LazyEval.js";
import type { UITAB } from "../UITAB.js";
import { Trait, Traitable } from "./trait.js";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}

export interface hasCanvasListener extends UITAB {
    canvasListener: canvasListener;
}

export class canvasListener extends Trait {
    constructor(traitable: Traitable, private canvas: HTMLCanvasElement) {
        super(traitable);
    }
    //abstract deactivate: () => void;
    override destroy() {
        this.#listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                this.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
        });
    }
    #listeners: Map<
        keyof HTMLElementEventMap,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Map<(ev: (any)) => void, ((e: any) => void) | null>
    > = new Map();
    public addListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: canvasListener | HTMLCanvasElement, ev: HTMLElementEventMap[K]) => void, options?: addListenerOptions) {
        let map: Map<(ev: HTMLElementEventMap[K]) => void, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (!(map = this.#listeners.get(type))) {
            map = new Map();
            this.#listeners.set(type, map);
        }
        if (options && options.once) {
            map.set(listener, listener);
            this.canvas.addEventListener(type, listener, options);
        } else {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            if (options && options.lazy !== undefined) {
                const lazyf = new LazyEval((e) => {
                    listener.call(this.canvas, e);
                });
                const proxyf = (e: HTMLElementEventMap[K]) => {
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
    public removeListener<K extends keyof HTMLElementEventMap>(type: K, listener: (ev: HTMLElementEventMap[K]) => void) {
        let map: Map<(ev: HTMLElementEventMap[K]) => void, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (map = this.#listeners.get(type)) {
            this.canvas.removeEventListener(type, map.get(listener) || listener);
            if (!map.delete(listener))
                console.warn('Tried to remove listener that did not exists:', type);
        }
    }
}