import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import type { Terrain } from "../world/terrain.js";
//import * as BABYLON from "../lib/babylon/index.js"
import type { PTDresult } from "../types/interfaces/index.js";
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial.js";
import { DynamicTexture } from "../lib/babylon/Materials/Textures/dynamicTexture.js";
import type { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import type { Scene } from "../lib/babylon/scene.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
export class Zones extends UITAB {
    private zonemateria: StandardMaterial;
    private PT: paintTexture;
    private zonedt: DynamicTexture
    private size = 10000;
    public canvas: HTMLCanvasElement;
    constructor(
        private ground: Terrain,
        private db: IDBDatabase,
        private groundMaterial: ShaderMaterial,
        private scene: Scene,
        private camera: ArcRotateCamera,
        private sea: Mesh
    ) {
        super();
        this.canvas = <any>scene.getEngine().getRenderingCanvas();
        // let DZ = new drawZone(canvas, scene, camera, ground, sea, DB, DT, groundmateria, grass, terrain);
        this.zonedt = new DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, scene, false);

        this.PT = new paintTexture(this.canvas, this.scene, this.camera, this.ground, this.sea, this.zonedt, 10000, 10000, super.getInstance() );
        this.zonemateria = new StandardMaterial("zoneMat", scene);
        this.zonemateria.diffuseTexture = this.zonedt;
    }
    activate = (): void => {
        this.activated=true;
        let ctx: CanvasRenderingContext2D = this.zonedt.getContext();
        this.ground.material = this.zonemateria;
        let centerX = this.size / 2
        let centerZ = this.size / 2
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, 0, this.size, this.size);
       // ctx.stroke();
       // this.zonedt.update()
        let me = this;
        this.db.transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
            console.log(this.result);
            
            (<PTDresult[]>this.result).forEach(z => {
                /*let m = new Matrix();
                m.setRow(0, new Vector4(1, 0, 0, centerX + z.coord.x));
                m.setRow(1, new Vector4(0, 1, 0, 0));
                m.setRow(2, new Vector4(0, 0, 1, centerZ + z.coord.z));
                m.setRow(3, new Vector4(0, 0, 0, 1));
                paintTexture.drawSubImage(z.size.h, z.size.w, z.ang_rad, m, me.zonedt._texture, me.scene.getEngine());*/



                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "blue";
                ctx.translate(centerX + z.coord.x, centerZ + z.coord.y * -1);
                console.log('Translate ', centerX + z.coord.x, centerZ + z.coord.y * -1)
                ctx.rotate(z.rad);
                console.log('Rotate: ', z.rad)
                ctx.fillStyle = "blue";
                ctx.fillRect(0, 0, z.size.h * -1, z.size.w);
                console.log('fillRect', 0, 0, z.size.h * -1, z.size.w)
            });
            ctx.stroke();
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