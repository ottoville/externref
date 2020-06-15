import { WorldScene } from "../world/scene";
import { Terrain } from "../world/terrain";
import { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera";
import { Trait, Traitable2 } from "./trait";
import { LazyEval } from "../LazyEval";

interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}

export class canvasListener {
    //abstract deactivate: () => void;
    static classDecorator<T extends Traitable2>(constructor: T): T/* & typeof canvasListener*/ {
        Object.getOwnPropertyNames(canvasListener.prototype).forEach(name => {
            if (name != 'destroy')
                return Object.defineProperty(constructor.prototype, name, Object.getOwnPropertyDescriptor(canvasListener.prototype, name)!);
        });
        const newConstructor = constructor// as (T & typeof canvasListener);

        return class extends newConstructor {
            constructor(...args: any[]) {
                args.push(new canvasListener(args[0], args[1], args[2], args[3], args[4], args[5]));
                super(...args);
            }
        }
    }
    public deactivate() {
        this.listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                this.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
        });
    }
    constructor(
        scene: WorldScene,
        terrain: Terrain,
        camera: ArcRotateCamera,
        device: GPUDevice,
        shaderModules: Map<string, GPUShaderModule>,
        public canvas: HTMLCanvasElement
    ) {
    }
    public listeners: Map<
        keyof HTMLElementEventMap,
        Map<(ev: any) => any, ((e: any) => void) | null>
    > = new Map();
    /*public getInstance() {
        return this;
    }*/
    public addListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: canvasListener | HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, options?: addListenerOptions) {
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
            let proxyf = (e: HTMLElementEventMap[K]) => {
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
    }
}