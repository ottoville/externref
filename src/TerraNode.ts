import type { Engine } from "./engine.js";
import { Mesh } from "/js/engine/engine.js";

import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { hasPhysics } from "./physics.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { DrawableDirect } from "./GPU/Drawable.js";

export class MainNode extends Mesh {
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();
    get_transformation = () => new TerraMatrix(this.engine.memory.buffer, this.gpu_pointer)//new TerraMatrix(this.data.buffer);

    get_velocity = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 16 * Float32Array.BYTES_PER_ELEMENT)
    }
    get_translation = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 12 * Float32Array.BYTES_PER_ELEMENT);
    }

    /*override update_scale = (x: number, y: number, z: number) => {
        super.update_scale(this.engine.rustEngine,x, y, z)
        this.#onUpdate();
    }*/
    /*override update_scale_and_rotation = (x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number) => {
        super.update_scale_and_rotation(this.engine.rustEngine,x, y, z, rx, ry, rz, rw);
        this.#onUpdate();
    }*/
    SetTranslationDelta = (value: [number, number, number] | TerraVector3) => {
        this.get_velocity().set(value);
        this.update_dynamic_buffer(this.engine.rustEngine);
    }

    SetTranslation = (value: [number, number, number] | TerraVector3) => {
        this.get_translation().set(value);
        this.update_dynamic_buffer(this.engine.rustEngine);
    }

    constructor(public engine: Engine, hasBounding: boolean, has_geometry:boolean, positionsCount = 0, vertices_stride = 3, point_light=0) {
        super(engine.rustEngine, MainNode.uniqueID++, hasBounding, has_geometry, positionsCount, vertices_stride, point_light);
        MainNode.Meshes.set(this.id, this);
        queueMicrotask(() => {
            if (this.#hasPhysics()) {
                engine.physics.tickables.add(this);
            }
        });
        this.update_dynamic_buffer(this.engine.rustEngine);
    }

    #hasPhysics = (): this is hasPhysics => {
        return 'hasGravity' in this && 'onPhysicTick' in this;
    }
}
export abstract class TerraNodeGPU<T extends DrawableDirect> extends MainNode {

    // abstract Drawable:DrawableDirect
    static GPUDataSize = 16 + 4 + 4 + 4 + 2;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader
    abstract Drawable: T;

    constructor(engine: Engine, public renderPipeline: RenderPipeline, positionsCount: number, hasBounding = false, has_geometry = false, vertices_stride = 3, point_light = 0) {
        super(engine, hasBounding, has_geometry, positionsCount, vertices_stride, point_light);
        Object.getOwnPropertyNames(TerraNodeGPU.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(TerraNodeGPU.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        //this.Drawable = createDrawable(this);
        queueMicrotask(() => {
            this.Drawable.dynamicBuffers.push([engine.gpu.BindGroupPosition, this.gpu_alignment]);
        })
        if (renderPipeline.dynamicBindGroupOffset.length)
            renderPipeline.dynamicBindGroupOffset[0] = this.gpu_alignment;
    }
    get vertices() {
        return new Float32Array(this.engine.memory.buffer, this.vertices_pointer, this.positions_count * this.vertices_stride);
    }
    get verticesArray() {
        const arr:Float32Array[] = [];
        for (let i=0; i< this.positions_count; i++) {
            arr.push(new Float32Array(this.engine.memory.buffer, this.vertices_pointer + i*Float32Array.BYTES_PER_ELEMENT*this.vertices_stride, this.vertices_stride))
        }
        return arr;
    }
}