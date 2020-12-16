import { LazyEval } from "../LazyEval";
import { GPU } from "../GPU";
import { UITAB } from "../UITAB";
import { Trait } from "./trait";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}

export interface hasCanvasListener extends UITAB {
    canvasListener: canvasListener;
}

export class canvasListener extends Trait {
    //abstract deactivate: () => void;
    public destroy() {
        this.#listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                GPU.instance.renderPassScreen.canvas.removeEventListener(type, proxy || listener);
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
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            let proxyf = (e: HTMLElementEventMap[K]) => {
                listener.call(GPU.instance.renderPassScreen.canvas, e);
                map && map.delete(listener);
            };
            map.set(listener, proxyf)

            GPU.instance.renderPassScreen.canvas.addEventListener(type, proxyf, options);
        } else {
            if (map.has(listener)) {
                console.warn('Adding same listener twice not supported: ', type);
                return;
            }
            if (options && options.lazy !== undefined) {
                let lazyf = new LazyEval((e) => {
                    listener.call(GPU.instance.renderPassScreen.canvas, e);
                });
                let proxyf = (e: HTMLElementEventMap[K]) => {
                    lazyf.eval(options.lazy!, e);
                };
                map.set(listener, proxyf);
                GPU.instance.renderPassScreen.canvas.addEventListener(type, proxyf);
            } else {
                map.set(listener, null);
                GPU.instance.renderPassScreen.canvas.addEventListener(type, listener);
            }
        }
    }
    public removeListener<K extends keyof HTMLElementEventMap>(type: K, listener: (ev: HTMLElementEventMap[K]) => any) {
        let map: Map<(ev: HTMLElementEventMap[K]) => any, ((e: HTMLElementEventMap[K]) => void) | null> | undefined;
        if (map = this.#listeners.get(type)) {
            GPU.instance.renderPassScreen.canvas.removeEventListener(type, map.get(listener) || listener);
            if (!map.delete(listener))
                console.warn('Tried to remove listener that did not exists:', type);
        }
    }
}