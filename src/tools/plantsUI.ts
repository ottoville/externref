import { UITAB } from "../UITAB.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { WorldScene } from "../world/scene.js";
import { canvasListener } from "../traits/canvasListener.js";
import { Trait, Traitable } from "../traits/trait.js";
import { TerraScene } from "../TerraScene.js";
import { Sea } from "../world/water.js";


export class PlantsUI extends UITAB {
    traits: Set<Trait> = new Set();
    public label: string = 'Plants';
    public static instance: UITAB | null = null;
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    canvasListener = new canvasListener(this);


    constructor(
        public scene: TerraScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea,
    ) {
        super(scene, terrain, camera, sea);
        console.log('activate plantsUI');
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(TerraScene.instance, this.camera, this.terrain, this.sea, this);

          //  this.PT = applyMixins<typeof BaseTerrainTool>(BaseTerrainTool, [worldPosition]);

            
            this.PT?.activate((response: PTDresult) => {
                //this.PT && this.PT.destroy();
                PlantsUI.plantsMesh.fillArea(response)
            }, { forceSharedVertices: false });
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
