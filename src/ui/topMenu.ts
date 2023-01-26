import type { GPU } from "../GPU.js"
import type { Terrain } from "../world/terrain.js";
import type { Engine } from "../engine.js";
import { UIRectangleNodeProps } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Zones } from "../tools/Zones.js";
import { TerrainToolButton } from "../tools/TerrainTool.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { SizeUnit } from "./UIRectangle.js";
declare const engine: Engine;

type MenuState = {
    menuOpenName: string | undefined,
    bitmap: ImageBitmap | undefined,
};
const keyBoardMap: string[] = []

export class createTopMenu extends UINode<{ gpu: GPU, terrain: Terrain }, MenuState> {
    constructor(props: { gpu: GPU, terrain: Terrain }) {
        super(props);
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

        engine.addInputListener('keydown', this, this.#inputListener);
    }
    menuTree = { level: 0 }
    #inputListener = (e: KeyboardEvent) => {
        if (this.state.menuOpenName === undefined) {
            this.menuTree.level = 1;
            if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
                const num = e.code.at(-1);
                if (num) {
                    const menu = keyBoardMap[parseInt(num) - 1];
                    if (menu) {
                        this.setState({
                            menuOpenName: menu
                        })
                    }
                }

            }
        } else if (e.code === 'Backspace' && this.menuTree.level === 1) {
            this.setState({
                menuOpenName: undefined
            })
        }
    }
    render() {
        const props = this.props;
        if (!this.state.bitmap)
            return null;
        const commonProps =
        {
            gpu: props.gpu,
            terrain: props.terrain,
            bitmap: this.state.bitmap,
            onClick: this.setActiveMenu
        }
        keyBoardMap.length = 0;
                const menus: {
            ctr: typeof PlantsUI | typeof TerrainToolButton | typeof Zones,
            props: UIRectangleNodeProps
        }[] = [
                UINode.createCtrProps(PlantsUI, {
                    ...commonProps,
                    open: this.state.menuOpenName === 'Plants',
                    label: 'Plants',
                    scale: { min_width: 0.07, y: 0.04, unit: SizeUnit["%"] },
                    translate: { x: -0.9, y: 0.9 },
                    text: 'Plants (1)',
                }),
                UINode.createCtrProps(TerrainToolButton,
                    {
                        ...commonProps,
                        open: this.state.menuOpenName === 'Terrain',
                        label: 'Terrain',
                        scale: { min_width: 0.07, y: 0.04, unit: SizeUnit["%"] },
                        translate: { x: -0.75, y: 0.9 },
                        text: 'Terrain (2)',
                        menuTree: this.menuTree,
                    }
                ),
                UINode.createCtrProps(Zones,
                    {
                        ...commonProps,
                        open: this.state.menuOpenName === 'Zones',
                        label: 'Zones',
                        scale: { min_width: 0.07, y: 0.04, unit: SizeUnit["%"] },
                        translate: { x: -0.6, y: 0.9 },
                        text: 'Zones (3)',
                        menuTree: this.menuTree,
                    }
                ),
            ];
        menus.forEach(menu => {
            keyBoardMap.push(menu.props.label)
        })
        return menus;
    }
    setActiveMenu = (menuName?: string) => {
        this.setState({
            menuOpenName: this.state.menuOpenName === menuName ? undefined : menuName
        })
    }
    override destroy(): void {
        super.destroy();
        this.state.bitmap?.close();
        engine.removeInputListener('keydown', this, this.#inputListener)
    }
}
