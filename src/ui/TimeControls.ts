import type { Engine } from '../engine.js';
import { UI, UINode } from './UINode.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import { Button } from './Button.js';
import { UIRectangleNodeButton } from './UIRectangleNode.js';
import { UIRectangleNodeHover } from './UIRectangleNodeHover.js';
declare const engine: Engine;

type MenuState = {
  timeOfDay: string;
};
const yPos = Object.freeze({
  anchor: Anchor.BOTTOM,
  value: [40, NumericUnit.px],
} as const);
const timeOfDayProps = Object.freeze({
  label: 'TimeOfDay',
  scale: {
    min_width: 300,
    unit: NumericUnit.px,
    y: 30,
  },
  translate: {
    x: {
      anchor: Anchor.RIGHT,
      value: [150, NumericUnit.px],
    },
    y: {
      anchor: Anchor.BOTTOM,
      value: [80, NumericUnit.px],
    },
  },
} as const);

const buttonScale = Object.freeze({
  min_width: 30,
  unit: NumericUnit.px,
  y: 30,
} as const);

const pauseProps = Button({
  UIRectangleProps: {
    label: 'pause',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [275, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = -1;
    },
  },
  text: '⏸️',
});

const playProps = Button({
  UIRectangleProps: {
    label: 'play',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [235, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 1;
    },
  },
  text: '▶️',
});

const fastForwardProps = Button({
  UIRectangleProps: {
    label: 'fastforward',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [190, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 2;
    },
  },
  text: '⏩',
});

const fastForward1Props = Button({
  UIRectangleProps: {
    label: 'fastforward1',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [145, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 4;
    },
  },
  text: '4⏩',
});

const fastForward2Props = Button({
  UIRectangleProps: {
    label: 'fastforward2',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [105, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 8;
    },
  },
  text: '8⏩',
});

const fastForward3Props = Button({
  UIRectangleProps: {
    label: 'fastforward3',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [65, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 16;
    },
  },
  text: '16⏩',
});

const fastForward4Props = Button({
  UIRectangleProps: {
    label: 'fastforward4',
    scale: buttonScale,
    translate: {
      x: {
        anchor: Anchor.RIGHT,
        value: [25, NumericUnit.px],
      },
      y: yPos,
    },
  },
  events: {
    onClick: () => {
      engine.physics.gameSpeed = 32;
    },
  },
  text: '32⏩',
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class createTimeControls extends UINode<{}, MenuState> {
  constructor() {
    super(
      {},
      {
        timeOfDay: new Date(engine.physics.tickTime * 1000).toUTCString(),
      },
    );
    setInterval(() => {
      this.setState({
        timeOfDay: new Date(engine.physics.tickTime * 1000).toUTCString(),
      });
    }, 1000);
  }
  render() {
    return [
      UI(
        UIRectangleNodeButton,
        Button({
          UIRectangleProps: timeOfDayProps,
          text: 'Time of day ' + this.state.timeOfDay,
        }),
      ),
      UI(UIRectangleNodeHover, pauseProps),
      UI(UIRectangleNodeHover, playProps),
      UI(UIRectangleNodeHover, fastForwardProps),
      UI(UIRectangleNodeHover, fastForward1Props),
      UI(UIRectangleNodeHover, fastForward2Props),
      UI(UIRectangleNodeHover, fastForward3Props),
      UI(UIRectangleNodeHover, fastForward4Props),
    ];
  }
  override destroy(): void {
    super.destroy();
  }
}
