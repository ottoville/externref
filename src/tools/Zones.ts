import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import type { Terrain } from "../world/terrain.js";
//import * as BABYLON from "../lib/babylon/index.js"
import type { PTDresult } from "../types/interfaces/index.js";

import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";

import { canvasListener } from "../traits/canvasListener.js";

import { Sea } from "../world/water.js";
import { TerraScene } from "../TerraScene.js";
import { DebugScene } from "../DebugScene.js";
import type { Trait } from "../traits/trait.js";

export class Zones extends UITAB {
    traits: Set<Trait> = new Set();
    public canvasListener = new canvasListener(this);
    //private zonemateria: StandardMaterial;
    private PT: paintTexture;
    #size = 5120;
    #ratio = this.ground.width / this.#size //texture coordinates
    zoneTexture = this.scene.gpu.device.createTexture({
        size: [5120, 5120, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
    });
    constructor(
        public scene: TerraScene,
        public ground: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea,
        debugScene: DebugScene
    ) {
        super(scene, ground, camera, sea);

        const texture = new OffscreenCanvas(5120, 5120);
        const ctx = texture.getContext('2d');
        if (!ctx)
            throw ('getting 2d context failed');
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, 0, 5120, 5120);
        let centerX = this.#size / 2;
        let centerZ = this.#size / 2;

        (async () => {
            (await this.scene.engine.DB).transaction("zones").objectStore("zones").getAll().onsuccess = (evt) => {
                //@ts-ignore
                (<PTDresult[]>evt.target.result).forEach(z => {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "blue";
                    ctx.translate(centerX + z.coord[0] / this.#ratio, centerZ + z.coord[1] / this.#ratio );
                    ctx.rotate(-z.rad);
                    ctx.fillStyle = "blue";
                    ctx.fillRect(0, 0, -(z.size.h / this.#ratio), -(z.size.w / this.#ratio));
                });
                ctx.stroke();
                const bitmap = texture.transferToImageBitmap();
                scene.gpu.device.defaultQueue.copyImageBitmapToTexture({ imageBitmap: bitmap }, { texture: this.zoneTexture }, [5120, 5120, 1]);
                bitmap.close();
            }
        })();
        
        ground.mesh.textureView = this.zoneTexture.createView();
        ground.mesh.drawable.then(d => {
            d.scene = debugScene;
        })
        // let DZ = new drawZone(canvas, scene, camera, ground, sea, DB, DT, groundmateria, grass, terrain);

        //this.zonedt = new DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, scene, false);

        this.PT = new paintTexture(this.scene, this.camera, this.ground, sea, this.zoneTexture, 5120, 5120, this, this.#ratio);
        this.PT.activate(async (response) => {
            (await this.scene.engine.DB).transaction("zones", 'readwrite').objectStore("zones").put(response);
        }, {});

        //@ts-ignore
       // this.zonemateria = new StandardMaterial("zoneMat", scene);
       // this.zonemateria.diffuseTexture = this.zonedt;
    }
    activate = async () => {
        return;
        //@ts-ignore
        let ctx: CanvasRenderingContext2D = this.zonedt.getContext();
        //@ts-ignore
        this.ground.terraMesh.material = this.zonemateria;
        let centerX = this.#size / 2
        let centerZ = this.#size / 2
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, 0, this.#size, this.#size);
       // ctx.stroke();
       // this.zonedt.update()
        let me = this;
        //@ts-ignore
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
            //@ts-ignore
            me.zonedt.update();
        }
        this.PT.activate(async (response) => {
            //@ts-ignore
            (await this.scene.DBP).transaction("zones", 'readwrite').objectStore("zones").put(response);
        }, {});
    }
    destroy = (): void => {
        this.ground.mesh.scene = this.scene;
        this.ground.mesh.textureView = this.ground.texture.createView();
        this.zoneTexture.destroy();
        this.PT.destroy();
      //  this.canvasListener.destroy();
        this.traits.forEach(trait => trait.destroy());
    }
}