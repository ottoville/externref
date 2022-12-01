import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";

import type { PTDresult } from "../types/interfaces/index.js";
import { Engine } from "../engine.js";
import { UIRectangleNode, type UIRectangleNodeProps } from "../ui/UIRectangleNode.js";
declare const engine: Engine;


export class PlantsUI extends UIRectangleNode {
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    scene = engine.scenes.get('main');

    constructor(props: UIRectangleNodeProps,
    ) {
        super(props);
        props.onClick = () => this.activateDraw();
        if (!this.scene) {
            throw (new Error('no scene'));
        }
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
    override destroy() {
        this.PT?.destroy();
        super.destroy();
    }
}
