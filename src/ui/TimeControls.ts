import type { Engine } from '../engine.js';
import { UINode } from './UINode.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import { Button } from './Button.js';
import { UIRectangleNode } from './UIRectangleNode.js';
declare const engine: Engine;

type MenuState = {
    timeOfDay: string
};

// eslint-disable-next-line @typescript-eslint/ban-types
export class createTimeControls extends UINode<{}, MenuState> {
    constructor() {
        super({});
        this.state = {
            timeOfDay: new Date(engine.physics.tickTime * 1000).toUTCString()
        }
        setInterval(() => {
            this.setState({
                timeOfDay: new Date(engine.physics.tickTime * 1000).toUTCString()
            });
        }, 1000);
    }
    render() {
        const yPos = {
            anchor: Anchor.BOTTOM,
            value: [40, NumericUnit.px],
        } as const;

        return [
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'TimeOfDay',
                    scale: { min_width: 300, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [150, NumericUnit.px],
                        },
                        y: {
                            anchor: Anchor.BOTTOM,
                            value: [80, NumericUnit.px],
                        }
                    },
                },
                text: 'Time of day ' + this.state.timeOfDay,
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'pause',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [275, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = -1
                },
                text: '⏸️',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'play',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [235, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 1
                },
                text: '▶️',

            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [190, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 2
                },
                text: '⏩',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward1',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [145, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 4
                },
                text: '4⏩',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward2',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [105, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 8
                },
                text: '8⏩',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward3',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [65, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 16
                },
                text: '16⏩',
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward4',
                    scale: { min_width: 30, unit: NumericUnit.px, y: 30 },
                    translate: {
                        x: {
                            anchor: Anchor.RIGHT,
                            value: [25, NumericUnit.px],
                        },
                        y: yPos
                    },
                },
                onClick: () => {
                    engine.physics.gameSpeed = 32
                },
                text: '32⏩',
            }))
        ];
    }
    override destroy(): void {
        super.destroy();
    }
}
