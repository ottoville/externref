import type { GPU } from "../GPU.js"
import type { Engine } from "../engine.js";
import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { SizeUnit } from "./UIRectangle.js";
declare const engine: Engine;

type MenuState = {
    menuOpenName: string | undefined,
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
            menuOpenName: undefined,
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
            onClick: this.setActiveMenu
        }
        return [
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'MSAA',
                scale: { min_width: 200, y: 50, unit: SizeUnit.px },
                translate: { x: 0, y: 0 },
                text: 'Toggle MSAA',
            }),
            UINode.createCtrProps(UIRectangleNode, {
                ...commonProps,
                label: 'Close',
                scale: { min_width: 200, y: 50, unit: SizeUnit.px },
                translate: { x: 0, y: -0.2 },
                text: 'Close',
                onClick: () => {
                    this.destroy();
                }
            })
        ];
    }
    setActiveMenu = (menuName?: string) => {
        this.setState({
            menuOpenName: this.state.menuOpenName === menuName ? undefined : menuName
        })
    }
    override destroy(): void {
        super.destroy();
        this.state.bitmap?.close();
        createSettingsMenu.addKeydownListener(this.gpu)
    }
}
