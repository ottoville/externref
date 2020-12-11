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
                ctx.strokeStyle = "blue";
                ctx.fillStyle = "blue";
                ctx.lineWidth = 1;
                //@ts-ignore
                (<PTDresult[]>evt.target.result).forEach(z => {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX + z.coord[0] / this.#ratio, centerZ + z.coord[1] / this.#ratio );
                    ctx.rotate(-z.rad);
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

        this.PT = new paintTexture(this.scene, this.camera, this.ground, sea, this.zoneTexture, 5120, 5120, this, this.#ratio);
        this.PT.activate(async (response) => {
            (await this.scene.engine.DB).transaction("zones", 'readwrite').objectStore("zones").put(response);
        }, {});
    }
    destroy = (): void => {
        this.ground.mesh.scene = this.scene;
        this.ground.mesh.textureView = this.ground.texture.createView();
        this.zoneTexture.destroy();
        this.PT.destroy();
        this.traits.forEach(trait => trait.destroy());
    }
}