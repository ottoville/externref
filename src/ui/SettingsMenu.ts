import { UI, UINode } from './UINode.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import { Button } from './Button.js';
import type { Engine } from '../engine.js';
import { UIRectangleNodeHover } from './UIRectangleNodeHover.js';
declare const engine: Engine;

const scale = {
  min_width: 200,
  unit: NumericUnit.px,
  y: 50,
};
const x = {
  anchor: Anchor.CENTER,
  value: [0],
} as const;

const MSAAButton = Button({
  UIRectangleProps: {
    label: 'MSAA',
    scale,
    translate: {
      x,
      y: {
        anchor: Anchor.CENTER,
        value: [0],
      },
    },
  },
  text: 'Toggle MSAA',
});
const closeButton = Button({
  UIRectangleProps: {
    label: 'Close',
    scale,
    translate: {
      x,
      y: {
        anchor: Anchor.CENTER,
        value: [-60, NumericUnit.px],
      },
    },
  },
  text: 'Close',
});

const devToolsbutton = Button({
  UIRectangleProps: {
    label: 'DevTools',
    scale,
    translate: {
      x,
      y: {
        anchor: Anchor.CENTER,
        value: [-120, NumericUnit.px],
      },
    },
  },
  text: 'DevTools',
});

export class createSettingsMenu extends UINode {
  static addKeydownListener() {
    document.addEventListener(
      'keydown',
      function openSettings(e: KeyboardEvent) {
        if (e.code === 'Escape') {
          document.removeEventListener('keydown', openSettings);
          new createSettingsMenu();
        }
      },
    );
  }
  constructor() {
    super({
      onMounted: () => {
        engine.setTabIndex(this.children[0] as UIRectangleNodeHover);
      },
    });
  }
  render() {
    return [
      UI(UIRectangleNodeHover, MSAAButton),
      UI(
        UIRectangleNodeHover,
        Object.assign(closeButton, {
          events: {
            ...closeButton.events,
            onClick: () => {
              this.destroy();
            },
          },
        }),
      ),
      UI(
        UIRectangleNodeHover,
        Object.assign(devToolsbutton, {
          events: {
            ...devToolsbutton.events,
            onClick: () => {
              document
                .querySelector('game-container')!
                .setAttribute('devtools', 'true');
              this.destroy();
            },
          },
        }),
      ),
    ];
  }
  override destroy(): void {
    super.destroy();
    createSettingsMenu.addKeydownListener();
  }
}
