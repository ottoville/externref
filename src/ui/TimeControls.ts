import type { GPU } from "../GPU.js"
import type { Engine } from "../engine.js";
import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
declare const engine: Engine;

type MenuState = {
    bitmap: ImageBitmap | undefined,
    timeOfDay: string
};

export class createTimeControls extends UINode<{ gpu: GPU }, MenuState> {
    gpu: GPU;
    constructor(props: { gpu: GPU }) {
        super(props);
        this.gpu = props.gpu;
        this.state = {
            bitmap: undefined,
            timeOfDay: new Date(Number(engine.physics.gameTime)).toUTCString()
        }
        fetch('/assets/button.webp').then(async asset => {
            const bitmap = await createImageBitmap(await asset.blob());
            this.setState({ bitmap });
        }).catch(err => {
            engine.showError(err);
        });
        setInterval(() => {
            this.setState({
                timeOfDay: new Date(Number(engine.physics.gameTime)).toUTCString()
            });
        }, 1000);
    }
    menuTree = { level: 0 }
    render() {
        const props = this.props;
        if (!this.state.bitmap)
            return null;
        const commonProps =
        {
            gpu: props.gpu,
            bitmap: this.state.bitmap,
        }
        const yPos = {
            value: [40, NumericUnit.px],
            anchor: Anchor.BOTTOM
        } as const;
        return [
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
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
                text: 'Time of day ' + this.state.timeOfDay,
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'pause',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [275, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '⏸️',
                onClick: () => {
                    engine.physics.gameSpeed = -1
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'play',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [235, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '▶️',
                onClick: () => {
                    engine.physics.gameSpeed = 1
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'fastforward',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [190, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 2
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'fastforward1',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [145, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '4⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 4
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'fastforward2',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [105, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '8⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 8
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'fastforward3',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [65, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '16⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 16
                }
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'fastforward4',
                scale: { min_width: 30, y: 30, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [25, NumericUnit.px],
                        anchor: Anchor.RIGHT
                    },
                    y: yPos
                },
                text: '32⏩',
                onClick: () => {
                    engine.physics.gameSpeed = 32
                }
            })
        ];
    }
    override destroy(): void {
        super.destroy();
        this.state.bitmap?.close();
    }
}
