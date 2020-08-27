import type { isLight } from "./lights";
import type { hasPhysics } from "./physics";
import type { TerraScene } from "./TerraScene";
import type { worldPosition } from "./traits/worldPosition";



export abstract class TerraNode implements Partial<hasPhysics> {
    abstract onPhysicTick: (time: number) => void
    abstract worldPosition?: worldPosition

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }
    constructor(public scene: TerraScene) {
        queueMicrotask(() => {
            if (this.hasPhysics()) {
                scene.physics.tickables.add(this);
            }
            if (this.isLight()) {
                scene.gpuscene.lights.add(this);
            }
        });

    }
}