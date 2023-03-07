import type { GPU } from "../GPU.js"
import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";

type MenuState = {
    fps: number
};

export class CreateFPSMeter extends UINode<{ gpu: GPU }, MenuState> {
    gpu: GPU;
    constructor(props: { gpu: GPU }) {
        super(props);
        this.gpu = props.gpu;
        this.state = {
            fps: 0
        }
        window.setInterval(() => {
            this.setState({
                fps: props.gpu.fps
            });
        }, 500)
    }
    render() {
        const props = this.props;
        return [
            UINode.createCtrProps(UIRectangleNode, {
                gpu: props.gpu,
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
