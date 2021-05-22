import type { Engine } from "./engine.js";
import { Mesh } from "/js/engine/engine.js";

import type { isLight } from "./lights.js";
import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { hasPhysics } from "./physics.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { DrawableDirect } from "./GPU/Drawable.js";

export abstract class MainNode extends Mesh {
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();
    readonly acceleration = new Float32Array(this.engine.memory.buffer, this.gpu_pointer + 24 * Float32Array.BYTES_PER_ELEMENT, 4);
    get_transformation = () => new TerraMatrix(this.engine.memory.buffer, this.gpu_pointer)//new TerraMatrix(this.data.buffer);

    get_velocity = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 16 * Float32Array.BYTES_PER_ELEMENT)
    }
    get_translation = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 12 * Float32Array.BYTES_PER_ELEMENT);
    }

    update_scale = (x: number, y: number, z: number) => {
        super.update_scale(x, y, z)
        this.#onUpdate();
    }
    update_scale_and_rotation = (x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number) => {
        super.update_scale_and_rotation(x, y, z, rx, ry, rz, rw);
        this.#onUpdate();
    }
    #onUpdate = (): void => {
        if (this.hasBounding) {
            this.set_bounding_need_dirty_min();
            this.set_bounding_need_dirty_max();
        }
        this.updateDynamicBuffer();
    }
    SetTranslationDelta = (value: [number, number, number] | TerraVector3) => {
        this.get_velocity().set(value);
        this.updateDynamicBuffer();
    }

    SetTranslation = (value: [number, number, number] | TerraVector3) => {
        this.get_translation().set(value);
        this.#onUpdate();
    }
    /*
    setTranslationX = (value: number) => {
        this.translation[0] = value;
        this.#onUpdate();
    }
    setTranslationY = (value: number) => {
        this.translation[1] = value;
        this.#onUpdate();
    }
    setTranslationZ = (value: number) => {
        this.translation[2] = value;
        this.#onUpdate();
    }*/

    constructor(public engine: Engine, private hasBounding: boolean, positionsCount = 0, vertices_stride = 3) {
        super(engine.rustEngine, MainNode.uniqueID++, hasBounding, true, positionsCount, vertices_stride);
        MainNode.Meshes.set(this.id, this);
        queueMicrotask(() => {
            if (this.#hasPhysics()) {
                engine.physics.tickables.add(this);
            }
            if (this.#isLight()) {
                //scene.lights.add(this);
            }
        });
        this.updateDynamicBuffer();
    }

    updateDynamicBuffer = () => {
        this.engine.gpu.queue.set(new Float32Array(this.engine.memory.buffer.slice(this.gpu_pointer, this.gpu_pointer + TerraNodeGPU.GPUDataSize * Float32Array.BYTES_PER_ELEMENT)), this.gpu_alignment);
    }

    #hasPhysics = (): this is hasPhysics => {
        return 'hasGravity' in this && 'onPhysicTick' in this;
    }
    #isLight = (): this is isLight => {
        return 'lightType' in this;
    }
}
export abstract class TerraNodeGPU<T extends DrawableDirect> extends MainNode {

    // abstract Drawable:DrawableDirect
    static GPUDataSize = 16 + 4 + 4 + 4 + 4;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader
    abstract Drawable: T;

    constructor(public engine: Engine, public renderPipeline: RenderPipeline, public positionsCount: number, hasBounding = false, vertices_stride = 3) {
        super(engine, hasBounding, positionsCount, vertices_stride);

        //this.Drawable = createDrawable(this);
        queueMicrotask(() => {
            this.Drawable.dynamicBuffers.push([engine.gpu.BindGroupPosition, this.gpu_alignment]);
        })
        if (renderPipeline.dynamicBindGroupOffset.length)
            renderPipeline.dynamicBindGroupOffset[0] = this.gpu_alignment;
        
    }
}



export class PositionNode extends MainNode {
    constructor(engine: Engine) {
        super(engine, false);
    }
}