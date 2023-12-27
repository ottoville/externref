import { paintPlane } from '../paintGround/paintPlane.js';
import type { Plants } from '../plants/Plants.js';
import type { GPU } from '../GPU.js';
import type { PTDresult } from '../types/interfaces/index.js';
import type { Engine, ListenerObj } from '../engine.js';
import { UI } from '../ui/UINode.js';
import { Anchor, NumericUnit } from '../ui/UIRectangle.js';
import type { TopMenuButtonProps } from '../ui/topMenu.js';
import { Button } from '../ui/Button.js';
import {
  UIRectangleNodeHover,
  type UIRectangleNodeHoverProps,
} from '../ui/UIRectangleNode.js';
declare const engine: Engine;

const buttonProps = Button({
  UIRectangleProps: {
    label: 'createGrassButton',
    scale: {
      min_width: 180,
      unit: NumericUnit.px,
      y: 50,
    },
    translate: {
      x: {
        anchor: Anchor.LEFT,
        value: [100, NumericUnit.px],
      },
      //will be overriden
      y: {
        anchor: Anchor.TOP,
        value: [100, NumericUnit.px],
      },
    },
  },
  text: 'Create grass (1)',
});

export class PlantsUI extends UIRectangleNodeHover {
  static plantsMesh: Plants;
  private PT: paintPlane | null = null;
  scene = engine.scenes.get('main');
  constructor(override props: UIRectangleNodeHoverProps & TopMenuButtonProps) {
    super(props);

    if (!this.scene) {
      throw new Error('no scene');
    }
  }
  #inputListener: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (e.code === 'Digit1') {
        this.activateDraw();
      }
    },
    object: this,
    type: 'keydown',
  };
  private wasOpen = false;
  override render(gpu: GPU, force: boolean) {
    super.render(gpu, force);
    if (this.props.open) {
      this.wasOpen = true;
      engine.addInputListener(this.#inputListener);
      return [
        UI(
          UIRectangleNodeHover,
          Object.assign(buttonProps, {
            UIRectangleProps: {
              ...buttonProps.UIRectangleProps,
              translate: {
                ...buttonProps.UIRectangleProps.translate,
                y: this.props.subMenuPosition,
              },
            },
            events: {
              ...buttonProps.events,
              onClick: () => this.activateDraw(),
            },
          }),
        ),
      ];
    } else if (this.wasOpen) {
      this.wasOpen = false;
      this.PT?.destroy();
      engine.clearInputListeners(this);
    }
    return null;
  }
  activateDraw = () => {
    try {
      this.PT = new paintPlane(
        this.scene!,
        this.props.terrain,
        (response: PTDresult) => {
          PlantsUI.plantsMesh.fillArea(response);
        },
      );
    } catch (e) {
      console.error(e);
    }
  };
  override destroy(): void {
    super.destroy();
    this.PT?.destroy();
    engine.clearInputListeners(this);
  }
}
