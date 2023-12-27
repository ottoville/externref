import { UIRectangle, UIRectangleProps } from './UIRectangle.js';
import { UINode } from './UINode.js';
import { UIRectangleBackground } from './UIRectangleBackground.js';
import { UIRectangleTextOnly } from './UIRectangleTextOnly.js';
import type { GPU } from '../GPU.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

type MenuEvent = (menuName?: string) => void;

export type UIRectangleNodeProps = {
  UIRectangleProps: Omit<UIRectangleProps, 'canvaspipeline' | 'renderPass'>;
  bitmap?: ImageBitmap | undefined;
  text: string;
  events?:
    | {
        onClick?: MenuEvent;
        onPointerEnter?: MenuEvent;
        onPointerLeave?: MenuEvent;
      }
    | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: (readonly [any, any] | null)[] | null | undefined;
};

export type UIRectangleNodeState = {
  bitmap?: ImageBitmap | undefined;
};

export class UIRectangleNode<
  S extends UIRectangleNodeState = UIRectangleNodeState,
  P extends UIRectangleNodeProps = UIRectangleNodeProps,
> extends UINode<P, S> {
  #instance?: UIRectangle | undefined;
  constructor(props: P) {
    super(props, { bitmap: props.bitmap } as Readonly<S>);
  }
  destroyInstance() {
    if (this.#instance) {
      if (this.#instance instanceof UIRectangle) {
        this.#instance.destroy();
      }
    }
    this.#instance = undefined;
  }
  override destroy() {
    super.destroy();
    this.destroyInstance();
  }
  render(gpu: GPU, force: boolean) {
    if (force) {
      /*
          When GPU is destroyed and switching to new GPU
      */
      this.destroyInstance();
    }
    const { text, children } = this.props;
    const { bitmap } = this.state;
    const commonProps: UIRectangleProps = {
      canvaspipeline: gpu.UIPipeline,
      renderPass: gpu.renderPassCanvas,
      ...this.props.UIRectangleProps,
    };
    if (this.props.events) {
      commonProps.events = {};
      for (const event in this.props.events) {
        //@ts-expect-error
        commonProps.events[event] = () => {
          //@ts-expect-error
          this.props.events[event](this.props.UIRectangleProps.label);
        };
      }
    }
    if (!this.#instance) {
      if (this.props.text === 'Zones (3)')
        console.log('create instance', this.props.text);
      if (bitmap) {
        if (bitmap instanceof ImageBitmap) {
          this.#instance = new UIRectangleBackground(
            commonProps,
            {
              border_height: 0.2,
              border_width: 0.2,
              texture: bitmap,
            },
            this.props.text,
          );
        }
      } else {
        this.#instance = new UIRectangleTextOnly(commonProps, text);
      }
    } else if (
      this.#instance instanceof UIRectangleBackground ||
      this.#instance instanceof UIRectangleTextOnly
    ) {
      let reRender = force;
      if (this.#instance instanceof UIRectangleBackground) {
        if (
          bitmap instanceof ImageBitmap &&
          bitmap !== this.#instance.backgroundAsset.texture
        ) {
          this.#instance.backgroundAsset = {
            border_height: 0.2,
            border_width: 0.2,
            texture: bitmap,
          };
          reRender = true;
        }
      }

      if (text !== this.#instance.text) {
        this.#instance.text = text;
        reRender = true;
      }
      if (reRender) {
        this.#instance.createTexture();
      }
    }
    if (children) {
      return children;
    }
    return null;
  }
}
const buttonTexture = await fetch('/assets/button.webp')
  .then((asset) => asset.blob())
  .then(createImageBitmap);
const buttonTextureHover = await fetch('/assets/button_hover.webp')
  .then((asset) => asset.blob())
  .then(createImageBitmap);

export class UIRectangleNodeButton<
  S extends UIRectangleNodeState = UIRectangleNodeState,
  P extends UIRectangleNodeProps = UIRectangleNodeProps,
> extends UIRectangleNode<S, P> {
  constructor(props: P) {
    props.bitmap = buttonTexture;
    super(props);
  }
}
let currentTabIndex = 1;

export type UIRectangleNodeHoverProps = UIRectangleNodeProps & {
  tabIndex?: number;
};

export class UIRectangleNodeHover<
  S extends UIRectangleNodeState = UIRectangleNodeState,
> extends UIRectangleNodeButton<S, UIRectangleNodeHoverProps> {
  changeTabIndex = (tabIndex: number) => {
    this.setState({
      ...this.state,
      bitmap:
        this.props.tabIndex === tabIndex ? buttonTextureHover : buttonTexture,
    });
  };
  constructor(props: UIRectangleNodeHoverProps) {
    props.tabIndex = props.tabIndex ?? currentTabIndex++;
    props.events = {
      ...props.events,
      onPointerEnter: () => {
        engine.setTabIndex(props.tabIndex!);
      },
      onPointerLeave: () => {
        engine.setTabIndex(0);
      },
    };
    super(props);
    engine.getTabIndex(this.changeTabIndex);
  }
  override destroy() {
    engine.TabIndexSubscribions.delete(this.changeTabIndex);
    super.destroy();
  }
}
