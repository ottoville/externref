import type { GPU } from '../GPU.js';
import type { Terrain } from '../world/Terrain.js';
import type { Engine, ListenerObj } from '../engine.js';
import { UI, UINode } from './UINode.js';
import { TerrainToolButton } from '../tools/TerrainTool.js';
import { PlantsUI } from '../tools/plantsUI.js';
import { Anchor, NumericUnit, VerticalPosition } from './UIRectangle.js';
import { Zones } from '../tools/Zones.js';
import { Button } from './Button.js';
import { UIRectangleNodeProps } from './UIRectangleNode.js';
declare const engine: Engine;

type MenuState = {
  menuOpenName: string | undefined;
};
const keyBoardMap: string[] = [];

export type TopMenuButtonProps = {
  terrain: Terrain;
  menuTree: { level: number };
  open: boolean;
  subMenuPosition: VerticalPosition;
};

const y = Object.freeze({
  anchor: Anchor.TOP,
  value: [25, NumericUnit['px']] as const,
});

const plantsButton = Button({
  UIRectangleProps: {
    label: 'Plants',
    scale: {
      min_width: 120,
      unit: NumericUnit['px'],
      y: 30,
    },
    translate: {
      x: {
        anchor: Anchor.LEFT,
        value: [65, NumericUnit['px']],
      },
      y,
    },
  },
  text: 'Plants (1)',
});

const zonesProps = Button({
  UIRectangleProps: {
    label: 'Zones',
    scale: {
      min_width: 110,
      unit: NumericUnit['px'],
      y: 30,
    },
    translate: {
      x: {
        anchor: Anchor.LEFT,
        value: [300, NumericUnit['px']],
      },
      y,
    },
  },
  text: 'Zones (3)',
});

const terrainButton = Button({
  UIRectangleProps: {
    label: 'Terrain',
    scale: {
      min_width: 110,
      unit: NumericUnit['px'],
      y: 30,
    },
    translate: {
      x: {
        anchor: Anchor.LEFT,
        value: [185, NumericUnit['px']],
      },
      y,
    },
  },
  text: 'Terrain (2)',
});

export class createTopMenu extends UINode<
  { gpu: GPU; terrain: Terrain },
  MenuState
> {
  constructor(props: { gpu: GPU; terrain: Terrain }) {
    super(props, {
      menuOpenName: undefined,
    });
    engine.addInputListener(this.#inputListener);
  }
  menuTree = {
    level: 0,
  };
  #inputListener: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (this.state.menuOpenName === undefined) {
        this.menuTree.level = 1;
        if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
          const num = e.code.at(-1);
          if (num) {
            const menu = keyBoardMap[parseInt(num) - 1];
            if (menu) {
              this.setState({
                menuOpenName: menu,
              });
            }
          }
        }
      } else if (e.code === 'Backspace' && this.menuTree.level === 1) {
        this.setState({
          menuOpenName: undefined,
        });
      }
    },
    object: this,
    type: 'keydown',
  };
  render() {
    const props = this.props;
    const commonProps = {
      menuTree: this.menuTree,
      subMenuPosition: {
        anchor: Anchor.TOP,
        value: [70, NumericUnit.px],
      } as const,
      terrain: props.terrain,
    } satisfies Partial<UIRectangleNodeProps & TopMenuButtonProps>;
    keyBoardMap.length = 0;
    const menus = [
      UI(
        PlantsUI,
        Object.assign(plantsButton, {
          ...commonProps,
          events: {
            ...plantsButton.events,
            onClick: () => this.setActiveMenu('Plants'),
          },
          open: this.state.menuOpenName === 'Plants',
        }),
      ),
      UI(
        TerrainToolButton,
        Object.assign(terrainButton, {
          ...commonProps,
          events: {
            ...terrainButton.events,
            onClick: () => this.setActiveMenu('Terrain'),
          },
          open: this.state.menuOpenName === 'Terrain',
        }),
      ),
      UI(
        Zones,
        Object.assign(zonesProps, {
          ...commonProps,
          events: {
            ...zonesProps.events,
            onClick: () => this.setActiveMenu('Zones'),
          },
          open: this.state.menuOpenName === 'Zones',
        }),
      ),
    ];
    menus.forEach((menu) => {
      keyBoardMap.push(menu[1].UIRectangleProps.label);
    });
    return menus;
  }
  setActiveMenu = (menuName: string) => {
    this.setState({
      menuOpenName: this.state.menuOpenName === menuName ? undefined : menuName,
    });
  };
  override destroy(): void {
    super.destroy();
    engine.removeInputListener(this.#inputListener);
  }
}
