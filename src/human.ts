import { Box } from "./GPU/Meshes/Box";
import { hasPhysics } from "./physics";
import { Scene } from "./Scene";
export class Human extends Box implements hasPhysics {
    hasGravity=true
    constructor(scene: Scene) {
        super(scene);
        this.setTranslationY(300)
        this.setTranslationZ(700)
        this.update(scale => scale.set([50, 50, 50]));
    }
    onPhysicTick = () => {
        console.log('human onPhysicTick')
       // this.worldPosition.SetTranslationDelta([0,-1,0])
    }
}