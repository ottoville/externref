import { UIRectangleNode } from './UIRectangleNode.js';
import { UINode } from './UINode.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

type MenuState = {
    fps: number
};

// eslint-disable-next-line @typescript-eslint/ban-types
export class CreateFPSMeter extends UINode<{}, MenuState> {
    constructor() {
        super({
        });
        this.state = {
            fps: 0,
        };
        window.setInterval(() => {
            this.setState({
                fps: engine.gpu?.fps ?? 0,
            });
        },
        500);
    }
    render() {
        return [
            UINode.createCtrProps(UIRectangleNode,
                {
                    UIRectangleProps: {
                        borderSize: {
                            height: 'auto',
                            width: [
                                0,
                                NumericUnit.px
                            ],
                        },
                        label: 'FPS',
                        scale: {
                            min_width: 10, unit: NumericUnit.px, y: 30,
                        },
                        translate: {
                            x: {
                                anchor: Anchor.LEFT,
                                value: [
                                    15,
                                    NumericUnit.px
                                ],
                            },
                            y: {
                                anchor: Anchor.BOTTOM,
                                value: [
                                    25,
                                    NumericUnit.px
                                ],
                            },
                        },
                    },
                    text: this.state.fps.toString(),
                })
        ];
    }
    override destroy(): void {
        super.destroy();
    }
}
