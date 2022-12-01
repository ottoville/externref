import type { GPU } from "../GPU.js"
import { PlantsUI } from "../tools/plantsUI.js";
import type { Terrain } from "../world/terrain.js";
import type { Engine } from "../engine.js";
import { UIRectangleNode } from "./UIRectangleNode.js";
import { UINode } from "./UINode.js";
import { Zones } from "../tools/Zones.js";
import { TerrainToolButton } from "../tools/TerrainTool.js";
declare const engine: Engine;

type MenuState = {
    menuOpenName: string | undefined,
    bitmap: ImageBitmap | undefined,
};
export class createTopMenu extends UINode<{ gpu: GPU, terrain: Terrain }, MenuState> {

    constructor(props: { gpu: GPU, terrain: Terrain }) {
        super(props);
        this.state = {
            menuOpenName: undefined,
            bitmap: undefined
        }
        fetch('/assets/button.webp').then(async asset => {
            const bitmap = await createImageBitmap(await asset.blob());
            this.setState({ bitmap });
        }).catch(err => {
            engine.showError(err);
        })
    }
    render() {
        const props = this.props;
        if (!this.state.bitmap)
            return null;

        return [
            UIRectangleNode.createCtrProps({
                open: this.state.menuOpenName === 'Plants',
                onClick: this.setActiveMenu,
                gpu: props.gpu,
                terrain: props.terrain,
                bitmap: this.state.bitmap,
                label: 'UIButton',
                scale: { min_width: 0.07, y: 0.07 },
                translate: { x: -0.9, y: 0.9 },
                text: 'Plants',
                children: 
                    this.state.menuOpenName !== 'Plants' ? null : [{ctr: PlantsUI,
                        props: {
                            gpu: props.gpu,
                            terrain: props.terrain,
                            bitmap: this.state.bitmap,
                            label: 'createGrassButton',
                            scale: { min_width: 0.15, y: 0.07 },
                            translate: { x: -0.8, y: 0.8 },
                            open: true,
                            text: 'Create grass'
                        }
                }]
                
            }),
            TerrainToolButton.createCtrProps({ open: this.state.menuOpenName === 'Terrain',
            onClick: this.setActiveMenu, gpu: props.gpu, terrain: props.terrain, bitmap: this.state.bitmap, label: 'UIButton2', scale: { min_width: 0.07, y: 0.07 }, translate: { x: -0.75, y: 0.9 }, text: 'Terrain' }),
                Zones.createCtrProps({ open: this.state.menuOpenName === 'Zones',
                onClick: this.setActiveMenu,
                gpu: props.gpu, terrain: props.terrain, bitmap: this.state.bitmap, label: 'UIButton2', scale: { min_width: 0.07, y: 0.07 }, translate: { x: -0.6, y: 0.9 }, text: 'Zones' }),
        ]
    }
    setActiveMenu = (menuName: string) => {
        this.setState({
            menuOpenName: this.state.menuOpenName === menuName ? undefined: menuName
        })
    }
    destroy(): void {
        this.state.bitmap?.close();
    }
}

/*
type Props = { menu: typeof PlantsUI | typeof TerrainTool, terrain: Terrain, bitmap: ImageBitmap, gpu: GPU };
//let lastProps: Props | undefined = undefined;
class renderSubMenu {
    menuInstance: PlantsUI | TerrainTool;
    constructor(props: Props) {
        if (lastProps) {
            let changed = false;
            let key: keyof typeof props;
            for (key in props) {
                if (lastProps[key] !== props[key]) {
                    changed = true;
                    break;
                }
            }
            if (!changed) {
                return;
            }
        }
        //lastProps = structuredClone(props);
        const { menu, terrain, bitmap, gpu } = props;


        this.menuInstance = new menu(terrain, gpu, bitmap);

    }
}*/