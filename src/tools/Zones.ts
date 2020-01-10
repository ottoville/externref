import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import { texImage2D } from "../webgl.js";
export class Zones extends UITAB {
    public name: string = "zonestab"
    public activated:boolean;
    private zonemateria: BABYLON.StandardMaterial;
    private ctx: CanvasRenderingContext2D;
    private PT: paintTexture;
    private zonedt: BABYLON.DynamicTexture
    private size = 10000;
    public canvas: HTMLCanvasElement;
    constructor(
        private ground: BABYLON.GroundMesh,
        private db: IDBDatabase,
        private groundMaterial: BABYLON.ShaderMaterial,
        private scene: BABYLON.Scene,
        private camera: BABYLON.ArcRotateCamera,
        private sea: BABYLON.Mesh
    ) {
        super();
        this.canvas = <any>scene.getEngine().getRenderingCanvas();
        // let DZ = new drawZone(canvas, scene, camera, ground, sea, DB, DT, groundmateria, grass, terrain);
        this.zonedt = new BABYLON.DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, scene, false);

        this.PT = new paintTexture(this.canvas, this.scene, this.camera, this.ground, this.sea, this.zonedt, 10000, 10000, super.getInstance() );
        this.zonemateria = new BABYLON.StandardMaterial("zoneMat", scene);
        this.zonemateria.diffuseTexture = this.zonedt;
    }
    activate = (): void => {
        this.activated=true;
        this.ctx = this.zonedt.getContext();
        this.ground.material = this.zonemateria;
        let centerX = this.size / 2
        let centerZ = this.size / 2
        this.ctx.beginPath();
        this.ctx.fillStyle = "yellow";
        this.ctx.fillRect(0, 0, this.size, this.size);
        let me = this;
        this.db.transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
            this.result.forEach(z => {
                me.ctx.setTransform(1, 0, 0, 1, 0, 0);
                me.ctx.lineWidth = 1;
                me.ctx.strokeStyle = "blue";
                me.ctx.translate(centerX + z.coord.x, centerZ + z.coord.z * -1);
                me.ctx.rotate(z.ang._rad);
                me.ctx.fillStyle = "blue";
                me.ctx.fillRect(0, 0, z.size.h * -1, z.size.w);
            })
            me.ctx.stroke();
            me.zonedt.update();
        }
        this.PT.activate(async (response) => {
            this.db.transaction("zones", 'readwrite').objectStore("zones").put(response);
        }, {});
    }
    deactivate = (): void => {
        if (this.activated) {
            super.deactivate();
            this.PT.deactivate();
            this.activated=false;
            this.ground.material = this.groundMaterial;
        }
    }
}