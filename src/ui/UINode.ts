// eslint-disable-next-line @typescript-eslint/no-explicit-any
type returnNode<T extends UINode> = { ctr: new (props: any) => T, props: object }

export abstract class UINode<P extends object = object, S extends object = object> {
    static createCtrProps<P extends object, C extends typeof UINode<P>>(ctr: C, props: P) {
        return {
            ctr,
            props
        }
    }
    #children: (UINode | null)[] = [];
    //@ts-expect-error
    state: Readonly<S> = {};
    protected setState(state: Partial<S>) {
        this.state = {
            ...this.state,
            ...state
        };
        this.#requestRender();
    }
    abstract render(): (returnNode<UINode> | null)[] | null;

    constructor(protected props: Readonly<P>) {
        // Render after child constructor has been executed, to avoid error
        // "Cannot read private member #instance from an object whose class did not declare it"
        queueMicrotask(() => {
            this.#requestRender();
        })
    }
    abstract destroy(): void;
    #requestRender() {
        const output = this.render();
        if (output) {
            if(this.#children.length > output.length) {
                for(let i=output.length; i<this.#children.length; i++) {
                    this.#children[i]?.destroy();
                }
            }
            this.#children = output.map((child, i) => {
                const instance = this.#children[i];
                if (child?.ctr) {
                    if (instance) {
                        if(instance.constructor === child.ctr) {
                            instance.props = child.props
                            instance.#requestRender();
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
            this.#children.length=0;
        }
    }
}


