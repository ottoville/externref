import { UITAB } from "../UITAB.js";
import { paintTexture } from "../paintGround/paintTexture.js";
import { Terrain } from "../world/terrain.js";
import { PTDresult } from "../types/interfaces/index.js";

import type { Scene } from "../Scene.js";
import type { Engine } from "../engine.js";
import { TextureUsageEnums } from "../GPU/Texture.js";
import { TextureView } from "../GPU/TextureView.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
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

    private PT: paintTexture;
    #size = 5120;
    readonly #ratio:number //texture coordinates
    readonly #zoneTexture: RenderTarget<"rgba8unorm", 23>;
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

        this.#zoneTexture = new RenderTarget({
            gpu: engine.gpu!,
            size: {width: 5120, height: 5120},
            format: "rgba8unorm",
            usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC"],
            label: 'ZoneTexture'
        });

        if(engine.DB) {
            const texture = new OffscreenCanvas(5120, 5120)
            const ctx = texture.getContext('2d');
            if (!ctx)
                throw (new Error('getting 2d context failed'));
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
                    ctx.fillRect(0, 0, -(z.size.height / this.#ratio), -(z.size.width / this.#ratio));
                });
                ctx.stroke();
                this.#zoneTexture.copyFromExternalImage({source: texture}, {}, {width: 5120, height: 5120});
            }
        }
        
        terrain.mesh.setTextureView(new TextureView(this.#zoneTexture));
        terrain.mesh.set_scenes(staticScene.id)
        this.PT = new paintTexture(this.scene, this.terrain, this.#zoneTexture, 5120, 5120, this.#ratio, (response) => {
            engine.DB?.transaction("zones", 'readwrite').objectStore("zones").put(response);
        });
        /*this.PT.activate(async (response) => {
            (await this.scene.engine.DB).transaction("zones", 'readwrite').objectStore("zones").put(response);
        });*/
    }
    destroy = (): void => {
        this.terrain.mesh.set_scenes(this.scene.id)
        this.terrain.mesh.setTextureView(new TextureView(this.terrain.texture));
        this.#zoneTexture.destroy();
        this.PT.destroy();
    }
}