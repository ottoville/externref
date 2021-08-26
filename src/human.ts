import type { Engine } from "./engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { hasPhysics } from "./physics.js";
import type { Scene } from "./Scene.js";
export class Human extends Box implements hasPhysics {
    hasGravity=true
    constructor(engine:Engine, scenes: Scene[]) {
        super(engine, scenes);
        const translation=this.get_translation();
        this.SetTranslation([translation[0], 300, 700]);
       // this.setTranslationY(300)
        //this.setTranslationZ(700)
        this.update_scale(this.engine.rustEngine,50, 50, 50);
    }
    onPhysicTick = () => {

       // this.worldPosition.SetTranslationDelta([0,-1,0])
    }
}