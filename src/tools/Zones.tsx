import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import { Terrain } from "../world/terrain.js";
import { PTDresult } from "../types/interfaces/index.js";
import { canvasListener } from "../traits/canvasListener.js";

import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";
import type { Engine } from "../engine.js";
declare const engine:Engine;

export class Zones extends UITAB {
    static override label = 'Zones';
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
    readonly #ratio:number //texture coordinates
    readonly #zoneTexture:GPUTexture;
    scene: Scene;
    constructor(
        terrain: Terrain,
    ) {
        super(terrain);
        const initialScene=terrain.scenes[0];
        if(!initialScene) {
            throw(new Error('scene not found'))
        }
        this.scene=initialScene;
        const staticScene=engine.scenes.get('static');
        if(!staticScene) {
            throw(new Error('staticScene not found'));
        }
        this.#ratio = Terrain.size[0] / this.#size //texture coordinates
        this.#zoneTexture = engine.gpu.device.createTexture({
            size: [5120, 5120, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const texture = document.createElement('canvas');
        texture.width=5120;
        texture.height=5120;
        const ctx = texture.getContext('2d');
        if (!ctx)
            throw ('getting 2d context failed');
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.fillRect(0, 0, 5120, 5120);
        const centerX = this.#size / 2;
        const centerZ = this.#size / 2;
        engine.DB.transaction("zones").objectStore("zones").getAll().onsuccess = (evt) => {
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
            engine.gpu.device.queue.copyExternalImageToTexture({source: texture}, { texture: this.#zoneTexture }, [5120, 5120, 1]);
        }
        
        terrain.mesh.setTextureView(this.#zoneTexture.createView());
        terrain.mesh.set_scenes(staticScene.id)
        this.PT = new paintTexture(this.scene, this.terrain, this.#zoneTexture, 5120, 5120, this, this.#ratio, (response) => {
            engine.DB.transaction("zones", 'readwrite').objectStore("zones").put(response);
        });
        /*this.PT.activate(async (response) => {
            (await this.scene.engine.DB).transaction("zones", 'readwrite').objectStore("zones").put(response);
        });*/
    }
    destroy = (): void => {
        this.terrain.mesh.set_scenes(this.scene.id)
        this.terrain.mesh.setTextureView(this.terrain.texture.createView());
        this.#zoneTexture.destroy();
        this.PT.destroy();
        this.traits.forEach(trait => trait.destroy());
    }
}