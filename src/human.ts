//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import type { Engine } from "engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { Scene } from "./Scene.js";
declare const engine:Engine;

export class Human extends Box {
    constructor(scenes: Scene[]) {
        super(scenes, undefined,true, 'human');
        this.hasGravity = true;
        Object.getOwnPropertyNames(Human.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(Human.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.SetTranslation([-239.37437438964844, 1400, 910.1807250976562]);
        this.update_scale(engine.rustEngine,50, 50, 50);
       // engine.inputManager?.destroy();
       // engine.inputManager=new MeshCamera(engine.mainCamera);
    }
    override onPhysicTick = () => {

       // this.worldPosition.SetTranslationDelta([0,-1,0])
    }
}