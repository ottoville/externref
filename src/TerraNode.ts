import type { isLight } from "./lights";
import type { hasPhysics } from "./physics";
import type { TerraScene } from "./TerraScene";
import type { worldPosition } from "./traits/worldPosition";




export abstract class TerraNode implements Partial<hasPhysics> {
    // abstract onPhysicTick?: (time: number) => void
    abstract worldPosition?: worldPosition

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }

    static GPUDataSize = 4 * 16 + 4 * 4 + 4 * 4
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;

    readonly dataBuffer = new ArrayBuffer(TerraNode.GPUDataSize);
    readonly data: Float32Array = new Float32Array(this.dataBuffer);
    readonly customData: Float32Array = new Float32Array(this.dataBuffer,20*4,4);
    readonly bufferOffset = this.scene.gpuscene.NodeInstances.size * TerraNode.alignment;

    destroy() {
        this.scene.gpuscene.NodeInstances.delete(this);
    }

    constructor(public scene: TerraScene) {
        scene.gpuscene.NodeInstances.set(this, scene.gpuscene.NodeInstances.size * TerraNode.alignment);
        this.data.set([
            //3d matrix start, 64 bytes
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
            //3d matrix end
            //delta start, 12 bytes + alignment 4 byte
            0, 0, 0, 0,
            //delta end
            //custom data start, 16 bytes
            0, 0, 0, 0
            //custom data end
        ])
        queueMicrotask(() => {
            if (this.hasPhysics()) {
                scene.physics.tickables.add(this);
            }
            if (this.isLight()) {
                scene.gpuscene.lights.add(this);
            }
        });

    }
    async updateDynamicBuffer() {
        this.scene.gpuscene.queue.set(this.data, this.bufferOffset);
    }
}