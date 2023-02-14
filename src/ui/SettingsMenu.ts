import type { GPU } from "../GPU.js"
import type { Engine } from "../engine.js";
import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
declare const engine: Engine;

type MenuState = {
    bitmap: ImageBitmap | undefined,
};

export class createSettingsMenu extends UINode<{ gpu: GPU }, MenuState> {
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
        this.state = {
            bitmap: undefined,
        }
        fetch('/assets/button.webp').then(async asset => {
            const bitmap = await createImageBitmap(await asset.blob());
            this.setState({ bitmap });
        }).catch(err => {
            engine.showError(err);
        })
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
            borderSize: {
                width: [8, NumericUnit.px],
                height: 'auto',
            } as const
        }
        return [
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'MSAA',
                scale: { min_width: 200, y: 50, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [0, NumericUnit["%"]],
                        anchor: Anchor.CENTER
                    }, y: {
                        value: [0, NumericUnit["%"]],
                        anchor: Anchor.CENTER
                    },
                },
                text: 'Toggle MSAA',
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'Close',
                scale: { min_width: 200, y: 50, unit: NumericUnit.px },
                translate: {
                    x: {
                        value: [0, NumericUnit["%"]],
                        anchor: Anchor.CENTER
                    }, y: {
                        value: [-0.2, NumericUnit["%"]],
                        anchor: Anchor.CENTER
                    }
                },
                text: 'Close',
                onClick: () => {
                    this.destroy();
                }
            })
        ];
    }
    override destroy(): void {
        super.destroy();
        this.state.bitmap?.close();
        createSettingsMenu.addKeydownListener(this.gpu)
    }
}
