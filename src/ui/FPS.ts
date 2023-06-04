import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

type MenuState = {
    fps: number
};

// eslint-disable-next-line @typescript-eslint/ban-types
export class CreateFPSMeter extends UINode<{}, MenuState> {
    constructor() {
        super({});
        this.state = {
            fps: 0
        }
        window.setInterval(() => {
            this.setState({
                fps: engine.gpu?.fps ?? 0
            });
        }, 500)
    }
    render() {
        return [
            UINode.createCtrProps(UIRectangleNode, {
                UIRectangleProps: {
                    label: 'FPS',
                    scale: { min_width: 10, y: 30, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [15, NumericUnit.px],
                            anchor: Anchor.LEFT
                        },
                        y: {
                            value: [25, NumericUnit.px],
                            anchor: Anchor.BOTTOM
                        }
                    },
                    borderSize: {
                        width: [0, NumericUnit.px],
                        height: 'auto',
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
