import type { GPU } from "./GPU.js";
import type { TerraCamera } from "./TerraCamera.js";
import type { Engine } from "./engine.js";
import type { Terrain } from "./world/terrain.js";
declare const engine:Engine;

let sceneID=1;
export class Scene {
    readonly id=sceneID;
    ready: Promise<readonly [Terrain]> | undefined;

    constructor(public name: string, public gpu: GPU, public TerraCameras: [TerraCamera] | TerraCamera[], onRenderStart: (scene: Scene) => Promise<readonly [Terrain]> | undefined) {
        sceneID<<=1;
        engine.scenes.set(name, this);
        TerraCameras.forEach(camera => {
            camera.renderPass?.scenes.add(this);
        })

        const groundAndSea = onRenderStart(this);
        this.ready = groundAndSea;
    }
    
}

