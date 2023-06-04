import type { Engine } from "../engine.js";
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
import { Button } from "./Button.js";
import { UIRectangleNode } from "./UIRectangleNode.js";
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
            value: [40, NumericUnit.px],
            anchor: Anchor.BOTTOM
        } as const;

        return [
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'TimeOfDay',
                    scale: { min_width: 300, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [150, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: {
                            value: [80, NumericUnit.px],
                            anchor: Anchor.BOTTOM
                        }
                    },
                },
                text: 'Time of day ' + this.state.timeOfDay,
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'pause',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [275, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '⏸️',
                onClick: () => {
                    engine.physics.gameSpeed = -1
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'play',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [235, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '▶️',
                onClick: () => {
                    engine.physics.gameSpeed = 1
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [190, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 2
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward1',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [145, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '4⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 4
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward2',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [105, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '8⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 8
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward3',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [65, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '16⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 16
                }
            })),
            UINode.createCtrProps(UIRectangleNode, Button({
                UIRectangleProps: {
                    label: 'fastforward4',
                    scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [25, NumericUnit.px],
                            anchor: Anchor.RIGHT
                        },
                        y: yPos
                    },
                },
                text: '32⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 32
                }
            }))
        ];
    }
    override destroy(): void {
        super.destroy();
    }
}
