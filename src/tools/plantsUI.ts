import { UITAB } from "../UITAB.js";
//import { paintGround, DrawType } from "../paintGround.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WorldScene } from "../world/scene.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { canvasListener } from "../traits/canvasListener.js";
import { addTrait, Trait, Traitable } from "../traits/trait.js";



export interface PlantsUI extends canvasListener, UITAB, Traitable {

}
@addTrait(canvasListener)
export class PlantsUI extends UITAB {

    public label: string = 'Plants';
    public static instance: UITAB | null = null;
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
            this.PT = new paintPlane(this.scene, this.camera, this.terrain, this.scene.sea, this, this.scene.getEngine() as WebGPUEngine);

          //  this.PT = applyMixins<typeof BaseTerrainTool>(BaseTerrainTool, [worldPosition]);

            
            this.PT?.activate((response: PTDresult) => {
                this.PT && this.PT.destroy();
                this.scene.plants.fillArea(response)
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
