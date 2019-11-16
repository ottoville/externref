import { UITAB } from "../UITAB.js";
import { paintGround, DrawType } from "../paintGround.js";
import { Plants } from "../plants/Plants.js";




export class PlantsUI extends UITAB {

    public name: string = "terraintab";
    public label: string = 'Plants';
    public activated: boolean=false;

    private PT: paintGround;
    constructor(
        private ground: BABYLON.GroundMesh,
        public canvas: HTMLElement,
        private scene: BABYLON.Scene,
        private camera: BABYLON.ArcRotateCamera,
        private sea: BABYLON.Mesh,
        private zonedt: BABYLON.Texture,
        private plantsobj:Plants,
    ) {
        super();
        this.PT = new paintGround(this.canvas, this.scene, this.camera, this.ground, this.sea, this.zonedt);

    }
    activateDraw = () => {
        this.PT.activate(DrawType.plane, { forceSharedVertices: false }, (response: PTDresult, plane) => {
            this.PT.deactivate();
            this.plantsobj.fillArea(response)
        });
    }
    activate = () => {
        this.activated=true;
    }
    deactivate = () => {
        this.PT.deactivate();
        this.activated=false;
    }
}