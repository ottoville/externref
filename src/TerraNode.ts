import { RenderPipeline } from "./GPU/RenderPipeline";
import type { isLight } from "./lights";
import type { hasPhysics } from "./physics";
import type { TerraScene } from "./TerraScene";
import { boundable, Bounding } from "./traits/Boundable";
import type { worldPosition } from "./traits/worldPosition";



export abstract class TerraNode implements Partial<hasPhysics> {
    abstract worldPosition?: worldPosition

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }

    static GPUDataSize = 16 + 4 + 4
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader

    //readonly dataBuffer = new ArrayBuffer(TerraNode.GPUDataSize);
    readonly bufferOffsetBytes: number;

    readonly data: Float32Array;
    readonly customData: Float32Array;

    destroy() {
        this.scene.gpuscene.NodeInstances.delete(this);
    }

    constructor(public scene: TerraScene) {
        const bufferOffsetBytes = scene.gpuscene.DataSlots.pop();
        if (typeof (bufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.bufferOffsetBytes = bufferOffsetBytes;
        this.data = new Float32Array(this.scene.gpuscene.CPUData, bufferOffsetBytes, TerraNode.GPUDataSize);
        this.customData = new Float32Array(this.scene.gpuscene.CPUData, bufferOffsetBytes + 20 * 4, 4);

        
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
                scene.lights.add(this);
            }
        });
        this.updateDynamicBuffer();

    }

    async updateDynamicBuffer() {
        this.scene.gpuscene.queue.set(this.data, this.bufferOffsetBytes);
    }
}

export abstract class BoundableNode extends TerraNode implements boundable {
    indicesBuffer?: SharedArrayBuffer | undefined;
    abstract verticesPositionBuffer: SharedArrayBuffer;
    abstract verticesPositionStride: number;
    bounding: Bounding = new Bounding(this as boundable);
}
