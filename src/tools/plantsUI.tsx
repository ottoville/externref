import { UITAB } from "../UITAB.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";

import { canvasListener } from "../traits/canvasListener.js";
import { Trait } from "../traits/trait.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";


export class PlantsUI extends UITAB {
    static menuElem = (instance: PlantsUI) => {
        return <div><legend style="background-color:white">
            Terrain
        </legend>
            <button class="w3-bar-item w3-button" onClick={() => instance.activateDraw()}>Create poaceae</button>
        </div>
    };
    traits: Set<Trait> = new Set();
    static label = 'Plants';
    public static instance: UITAB | null = null;
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    canvasListener = new canvasListener(this);


    constructor(
        public scene: Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea,
    ) {
        super(scene, terrain, camera, sea);
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(this.scene, this.camera, this.terrain, this.sea, this, (response: PTDresult) => {
                //this.PT && this.PT.destroy();
                PlantsUI.plantsMesh.fillArea(response);
            });
            /*this.PT?.activate((response: PTDresult) => {
                //this.PT && this.PT.destroy();
                PlantsUI.plantsMesh.fillArea(response)
            });*/
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
