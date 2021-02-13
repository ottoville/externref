import { Box } from "./GPU/Meshes/Box.js";
import type { hasPhysics } from "./physics.js";
import type { Scene } from "./Scene.js";
export class Human extends Box implements hasPhysics {
    hasGravity=true
    constructor(scene: Scene) {
        super(scene);
        this.setTranslationY(300)
        this.setTranslationZ(700)
        this.update(scale => scale.set([50, 50, 50]));
    }
    onPhysicTick = () => {

       // this.worldPosition.SetTranslationDelta([0,-1,0])
    }
}