import { UITAB } from "../UITAB.js";
//import { paintGround, DrawType } from "../paintGround.js";
import { paintPlane } from "../paintGround/paintPlane.js";
import type { Plants } from "../plants/Plants.js";
import type { Terrain } from "../world/terrain.js";

import type { PTDresult } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WorldScene } from "../world/scene.js";




export class PlantsUI extends UITAB {

    public label: string = 'Plants';

    //private PT: paintGround;
    private PT: paintPlane;
    constructor(
        private ground: Terrain,
        public canvas: HTMLCanvasElement,
        private scene: WorldScene,
        private camera: ArcRotateCamera,
        private sea: Mesh,
        private plantsobj:Plants,
    ) {
        super();
        //this.PT = new paintGround(this.canvas, this.scene, this.camera, this.ground, this.sea);
        this.PT = new paintPlane(this.canvas, this.scene, this.camera, this.ground, this.sea, super.getInstance());

    }
    activateDraw = () => {
        this.PT.activate((response: PTDresult) => {
            this.PT.deactivate();
            this.plantsobj.fillArea(response)
        }, { forceSharedVertices: false });
    }
    activate = () => {
        this.activated=true;
    }
    deactivate = () => {
        this.PT.deactivate();
        this.activated=false;
    }
}