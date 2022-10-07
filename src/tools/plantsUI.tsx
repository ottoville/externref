import { UITAB } from "../UITAB.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";

import { canvasListener } from "../traits/canvasListener.js";
import { Trait } from "../traits/trait.js";
import { Engine } from "../engine.js";
declare const engine:Engine;


export class PlantsUI extends UITAB {
    static menuElem = (instance: PlantsUI) => {
        return <div><legend style="background-color:white">
            Terrain
        </legend>
            <button class="w3-bar-item w3-button" onClick={() => instance.activateDraw()}>Create poaceae</button>
        </div>
    };
    traits: Set<Trait> = new Set();
    static override label = 'Plants';
    public static instance: UITAB | null = null;
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    canvasListener: canvasListener;
    scene=engine.scenes.get('main');

    constructor(
        terrain: Terrain,
        canvas: HTMLCanvasElement
    ) {
        super(terrain);
        this.canvasListener = new canvasListener(this, canvas);
        if(!this.scene) {
            throw(new Error('no scene'));
        }
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(this.scene!, this.terrain, this, (response: PTDresult) => {
                //this.PT && this.PT.destroy();
                PlantsUI.plantsMesh.fillArea(response);
            });
        } catch (e) {
            console.error(e);
        }
    }
    activate = () => {
       // this.activated=true;
    }
    destroy = () => {
        this.PT?.destroy();
        this.traits.forEach(trait => trait.destroy());
    }
}
