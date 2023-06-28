// eslint-disable-next-line @typescript-eslint/no-explicit-any
type returnNode<T extends UINode> = { ctr: new (props: any) => T, props: object }
import type { GPU } from '../GPU.js'
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class UINode<P extends object = object, S extends object = object> {
    static createCtrProps<P extends object, C extends typeof UINode<P>>(ctr: C, props: ConstructorParameters<C>[0]) {
        return {
            ctr,
            props,
        }
    }
    #children: (UINode | null)[] = [];
    //@ts-expect-error
    state: Readonly<S> = {};
    #currentGPU!: GPU
    protected setState(state: Partial<S>) {
        this.state = {
            ...this.state,
            ...state,
        };
        this.#requestRender(this.#currentGPU);
    }
    abstract render(gpu: GPU, force: boolean): (returnNode<UINode> | null)[] | null;

    constructor(public props: Readonly<P>) {
        // Render after child constructor has been executed, to avoid error
        // "Cannot read private member #instance from an object whose class did not declare it"
        queueMicrotask(() => {
            engine.getGPU(this.#requestRender)
        })
    }
    destroy() {
        engine.GPUSubscribions.delete(this.#requestRender)
        this.#children.forEach(c => {
            c?.destroy();
        });
    }
    #requestRender = (gpu: GPU) => {
        const output = this.render(gpu,
            gpu !== this.#currentGPU);
        this.#currentGPU = gpu;

        if (output) {
            if (this.#children.length > output.length) {
                for (let i = output.length; i < this.#children.length; i++) {
                    this.#children[i]?.destroy();
                }
            }
            this.#children = output.map((child, i) => {
                const instance = this.#children[i];
                if (child?.ctr) {
                    if (instance) {
                        if (instance.constructor === child.ctr) {
                            instance.props = child.props;
                            instance.#requestRender(gpu);
                            return instance;
                        }
                        instance.destroy();
                    }
                    return new child.ctr(child.props);
                } else if (instance) {
                    instance.destroy();
                }
                return null;
            })
        } else {
            this.#children.forEach(c => {
                c?.destroy();
            });
            this.#children.length = 0;
        }
    }
}


