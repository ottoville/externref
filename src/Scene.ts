import type { GPU } from './GPU.js';
import type { Engine } from './engine.js';
import type { Terrain } from './world/Terrain.js';
declare const engine:Engine;

let sceneID=1;
export class Scene {
    readonly id=sceneID;
    ready: Promise<Terrain> | undefined;

    constructor(public name: string, public gpu: GPU, onRenderStart: (scene: Scene) => Promise<Terrain> | undefined) {
        sceneID<<=1;
        engine.scenes.set(name, this);
        this.ready = onRenderStart(this);
    }
}

