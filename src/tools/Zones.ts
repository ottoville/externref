import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import type { Terrain } from "../world/terrain.js";
//import * as BABYLON from "../lib/babylon/index.js"
import type { PTDresult } from "../types/interfaces/index.js";
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial.js";
import { DynamicTexture } from "../lib/babylon/Materials/Textures/dynamicTexture.js";
import type { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WorldScene } from "../world/scene.js";
import { canvasListener } from "../traits/canvasListener.js";
import { addTrait, Trait, Traitable } from "../traits/trait.js";
import { Sea } from "../world/water.js";

export interface Zones extends canvasListener, Traitable {

}

@addTrait(canvasListener)
export class Zones extends UITAB {
    private zonemateria: StandardMaterial;
    private PT: paintTexture;
    private zonedt: DynamicTexture
    private size = 10000;
    traits: Trait[];
    constructor(
        public scene: WorldScene,
        public ground: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea,
        ...traits: Trait[]
    ) {
        super(scene, ground, camera, sea);
        this.traits = this.initTraits(traits);

        // let DZ = new drawZone(canvas, scene, camera, ground, sea, DB, DT, groundmateria, grass, terrain);
        this.zonedt = new DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, scene, false);

        this.PT = new paintTexture(this.scene, this.camera, this.ground, sea, this.zonedt, 10000, 10000, this );
        this.zonemateria = new StandardMaterial("zoneMat", scene);
        this.zonemateria.diffuseTexture = this.zonedt;
    }
    activate = async () => {
        let ctx: CanvasRenderingContext2D = this.zonedt.getContext();
        //@ts-ignore
        this.ground.terraMesh.material = this.zonemateria;
        let centerX = this.size / 2
        let centerZ = this.size / 2
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, 0, this.size, this.size);
       // ctx.stroke();
       // this.zonedt.update()
        let me = this;
        (await this.scene.DBP).transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
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
                ctx.translate(centerX + z.coord[0], centerZ + z.coord[1] * -1);
                console.log('Translate ', centerX + z.coord[0], centerZ + z.coord[1] * -1)
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
            (await this.scene.DBP).transaction("zones", 'readwrite').objectStore("zones").put(response);
        }, {});
    }
    destroy = (): void => {
        //if (this.activated) {
           // super.deactivate();
            this.PT.destroy();
         //   this.activated = false;
            //@ts-ignore
            this.ground.material = this.groundMaterial;
       // }
    }
}