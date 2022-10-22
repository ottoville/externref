import { UITAB } from "../UITAB.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";

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
    static override label = 'Plants';
    public static instance: UITAB | null = null;
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    scene=engine.scenes.get('main');

    constructor(
        terrain: Terrain,
    ) {
        super(terrain);
        if(!this.scene) {
            throw(new Error('no scene'));
        }
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(this.scene!, this.terrain, (response: PTDresult) => {
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
    }
}
