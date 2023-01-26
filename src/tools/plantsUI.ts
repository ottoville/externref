import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";

import type { PTDresult } from "../types/interfaces/index.js";
import { Engine } from "../engine.js";
import { UIRectangleNode, type UIRectangleNodeProps } from "../ui/UIRectangleNode.js";
import { Terrain } from "../world/terrain.js";
import { UINode } from "../ui/UINode.js";
import { SizeUnit } from "../ui/UIRectangle.js";
declare const engine: Engine;


export class PlantsUI extends UIRectangleNode<object, UIRectangleNodeProps & { terrain: Terrain, open: boolean }> {
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    scene = engine.scenes.get('main');
    constructor(props: UIRectangleNodeProps & { terrain: Terrain, open: boolean },
    ) {
        super(props);
        if (!this.scene) {
            throw (new Error('no scene'));
        }
    }
    #inputListener = (e: KeyboardEvent) => {
        if (e.code === "Digit1") {
            this.activateDraw()
        }
    }
    #wasOpen = false;
    override render() {
        super.render();
        if (this.props.open) {
            this.#wasOpen = true
            engine.addInputListener('keydown', this, this.#inputListener);
            return [
                UINode.createCtrProps(UIRectangleNode, {
                    gpu: this.props.gpu,
                    bitmap: this.props.bitmap,
                    label: 'createGrassButton',
                    scale: { min_width: 0.15, y: 0.07, unit: SizeUnit["%"] },
                    translate: { x: -0.8, y: 0.8 },
                    text: 'Create grass (1)',
                    onClick: () => this.activateDraw()
                })
            ]
        } else if(this.#wasOpen) {
            this.#wasOpen = false;
            this.PT?.destroy();
            engine.clearInputListeners(this);
        }
        return null;
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(this.scene!, this.props.terrain, (response: PTDresult) => {
                PlantsUI.plantsMesh.fillArea(response);
            });
        } catch (e) {
            console.error(e);
        }
    }
    override destroy(): void {
        super.destroy();
        this.PT?.destroy();
        engine.clearInputListeners(this);
    }
}
