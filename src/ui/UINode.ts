import type { GPU } from '../GPU.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

type CtrProps<C extends typeof UINode<object> = typeof UINode<object>> =
  readonly [ctr: C, props: ConstructorParameters<C>[0]];

export function UI<P extends object, C extends typeof UINode<P>>(
  ctr: C,
  props: ConstructorParameters<C>[0],
) {
  return Object.freeze([Object.freeze(ctr), props] as const);
}

export abstract class UINode<
  P extends object = object,
  S extends object = object,
> {
  #children: (UINode | null)[] = [];
  /**
   * Undefined on first render
   */
  #currentGPU: GPU | undefined = undefined;
  protected setState(state: Partial<S>) {
    this.state = {
      ...this.state,
      ...state,
    };
    engine.getGPU(this.#requestRender, true);
  }
  abstract render(
    gpu: GPU,
    force: boolean, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): readonly (CtrProps<{ new (...args: any[]): UINode }> | null)[] | null;
  oldProps: object = {};
  constructor(
    public props: Readonly<P>,
    //@ts-expect-error
    public state: Readonly<S> = {},
  ) {
    for (const key in props) {
      //@ts-expect-error
      this.oldProps[key] = props[key];
    }
    // Render after child constructor has been executed, to avoid error
    // Some properties of child class is not initialized yet because their constructor has not been run
    // "Cannot read private member #instance from an object whose class did not declare it"
    queueMicrotask(() => {
      engine.getGPU(this.#requestRender);
    });
  }
  destroy() {
    engine.GPUSubscribions.delete(this.#requestRender);
    this.#children.forEach((c) => {
      c?.destroy();
    });
  }
  #requestRender = (gpu: GPU) => {
    const output = this.render(
      gpu,
      gpu !== this.#currentGPU && this.#currentGPU !== undefined,
    );
    this.#currentGPU = gpu;

    if (output) {
      if (this.#children.length > output.length) {
        for (let i = output.length; i < this.#children.length; i++) {
          this.#children[i]?.destroy();
        }
      }
      this.#children = output.map((child, i) => {
        const instance = this.#children[i];
        if (child) {
          const [ctr, props] = child;

          if (ctr) {
            if (instance) {
              // Instance may have been rendered already, check that constructor is same
              if (instance.constructor === ctr) {
                //if (instance.props.UIRectangleProps.label === 'Zones') {
                //  debugger;
                //}
                for (const key in props) {
                  //@ts-expect-error
                  if (instance.oldProps[key] === props[key]) {
                    continue;
                  }
                  instance.oldProps = {};
                  for (const key2 in instance.props) {
                    //@ts-expect-error
                    instance.oldProps[key2] = instance.props[key2];
                  }
                  instance.props = props;
                  instance.#requestRender(gpu);
                  break;
                }
                return instance;
              }
              instance.destroy();
            }
            console.debug('create UINode', props.text);
            return new ctr(props);
          } else if (instance) {
            instance.destroy();
          }
        }
        return null;
      });
    } else {
      this.#children.forEach((c) => {
        c?.destroy();
      });
      this.#children.length = 0;
    }
  };
}
