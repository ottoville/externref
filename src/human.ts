//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import type { Engine } from "./engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { Scene } from "./Scene.js";
declare const engine:Engine;

export class Human extends Box {
    constructor(scenes: Scene[]) {
        super(scenes,400,true, 'human');
        console.log('human',engine.rust.gpu_alignment(this.ptr))
        this.hasGravity = true;
        this.translation = [-239.37437438964844, 1400, 910.1807250976562];
        this.update_scale(50, 50, 50);
        //engine.inputManager?.destroy();
        //engine.inputManager=new MeshCamera(engine.mainCamera);
    }
    override onPhysicTick = () => {
        //engine.mainCamera.position=this.translation; //TODO: move to human.ts
    }
}