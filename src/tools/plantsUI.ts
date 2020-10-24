import { UITAB } from "../UITAB.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { WorldScene } from "../world/scene.js";
import { canvasListener } from "../traits/canvasListener.js";
import { addTrait, Trait, Traitable } from "../traits/trait.js";
import { TerraScene } from "../TerraScene.js";



export interface PlantsUI extends canvasListener, UITAB, Traitable {

}
@addTrait(canvasListener)
export class PlantsUI extends UITAB {

    public label: string = 'Plants';
    public static instance: UITAB | null = null;
    static plantsMesh: Plants;
    private PT: paintPlane | null = null;
    traits: Trait[];
    constructor(
        public scene: WorldScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        ...traits: Trait[]
    ) {
        super(scene, terrain, camera);
        this.traits = this.initTraits(traits);
        console.log('activate plantsUI');
    }
    activateDraw = () => {
        try {
            this.PT = new paintPlane(TerraScene.instance,this.scene, this.camera, this.terrain, this.scene.sea, this);

          //  this.PT = applyMixins<typeof BaseTerrainTool>(BaseTerrainTool, [worldPosition]);

            
            this.PT?.activate((response: PTDresult) => {
                this.PT && this.PT.destroy();
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
        this.traits.forEach(trait => trait.destroy());
        this.PT?.destroy();
       // super.deactivate();
       // this.activated = false;
    }
}
