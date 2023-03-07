import type { GPU } from "../GPU.js"
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
import { Button } from "./Button.js";

export class createSettingsMenu extends UINode<{ gpu: GPU }> {
    static addKeydownListener(gpu: GPU) {
        document.addEventListener('keydown', function openSettings(e: KeyboardEvent) {
            if (e.code === 'Escape') {
                document.removeEventListener('keydown', openSettings);
                if (!gpu.destroyed)
                    new createSettingsMenu({ gpu });
            }
        });
    }
    gpu: GPU;
    constructor(props: { gpu: GPU }) {
        super(props);
        this.gpu = props.gpu;
    }
    render() {
        return [
            UINode.createCtrProps(Button, {
                gpu: this.props.gpu,
                UIRectangleProps: {
                    label: 'MSAA',
                    scale: { min_width: 200, y: 50, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [0],
                            anchor: Anchor.CENTER
                        }, y: {
                            value: [0],
                            anchor: Anchor.CENTER
                        },
                    },
                },
                text: 'Toggle MSAA',
            }),
            UINode.createCtrProps(Button, {
                gpu: this.props.gpu,
                UIRectangleProps: {
                    label: 'Close',
                    scale: { min_width: 200, y: 50, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [0],
                            anchor: Anchor.CENTER
                        }, y: {
                            value: [-60, NumericUnit.px],
                            anchor: Anchor.CENTER
                        }
                    },
                },
                text: 'Close',
                onClick: () => {
                    this.destroy();
                }
            }),
            UINode.createCtrProps(Button, {
                gpu: this.props.gpu,
                UIRectangleProps: {
                    label: 'DevTools',
                    scale: { min_width: 200, y: 50, unit: NumericUnit.px },
                    translate: {
                        x: {
                            value: [0],
                            anchor: Anchor.CENTER
                        }, y: {
                            value: [-120, NumericUnit.px],
                            anchor: Anchor.CENTER
                        }
                    },
                },
                text: 'DevTools',
                onClick: () => {
                    document.querySelector('aside')!.style.display='block';
                }
            })
        ];
    }
    override destroy(): void {
        super.destroy();
        createSettingsMenu.addKeydownListener(this.gpu)
    }
}
