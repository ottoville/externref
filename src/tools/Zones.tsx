import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import type { Terrain } from "../world/terrain.js";
import type { PTDresult } from "../types/interfaces/index.js";
import { canvasListener } from "../traits/canvasListener.js";

import { Sea } from "../world/water.js";
import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";

export class Zones extends UITAB {
    static label = 'Zones';
    static menuElem = () => <div><legend style="background-color:white"> Draw zone </legend>
        <label >
            Residental
            <input class="w3-bar-item w3-button" type = "checkbox" name = "planning" value = "residental" />
        </label><br/>
        <label >
            Industry
            <input class="w3-bar-item w3-button" type = "checkbox" name = "planning" value = "industry" />
        </label><br/>
        <label >
            Commerce
            <input class="w3-bar-item w3-button" type = "checkbox" name = "planning" value = "commerce" />
        </label>
     </div>


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
        public scene: Scene,
        public ground: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea,
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
                ((evt.target.result) as PTDresult[]).forEach(z => {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX + z.coord[0] / this.#ratio, centerZ + z.coord[1] / this.#ratio );
                    ctx.rotate(-z.rad);
                    ctx.fillRect(0, 0, -(z.size.h / this.#ratio), -(z.size.w / this.#ratio));
                });
                ctx.stroke();
                const bitmap = texture.transferToImageBitmap();
                scene.gpu.device.queue.copyImageBitmapToTexture({ imageBitmap: bitmap }, { texture: this.zoneTexture }, [5120, 5120, 1]);
                bitmap.close();
            }
        })();
        
        ground.mesh.textureView = this.zoneTexture.createView();
        ground.mesh.Drawable.scene = scene.engine.scenes.get('static');
        this.PT = new paintTexture(this.scene, this.camera, this.ground, sea, this.zoneTexture, 5120, 5120, this, this.#ratio);
        this.PT.activate(async (response) => {
            (await this.scene.engine.DB).transaction("zones", 'readwrite').objectStore("zones").put(response);
        });
    }
    destroy = (): void => {
        this.ground.mesh.Drawable.scene = this.scene;
        this.ground.mesh.textureView = this.ground.texture.createView();
        this.zoneTexture.destroy();
        this.PT.destroy();
        this.traits.forEach(trait => trait.destroy());
    }
}