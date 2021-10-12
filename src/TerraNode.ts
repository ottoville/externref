import { Mesh } from "/js/engine/engine.js";

import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { hasPhysics } from "./physics.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { DrawableDirect } from "./GPU/Drawable.js";
import type { Scene } from "./Scene.js";
import type { Engine } from "engine.js";
declare const engine:Engine;

export class MainNode extends Mesh {
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();
    get_transformation = () => new TerraMatrix(engine.memory.buffer, this.gpu_pointer)//new TerraMatrix(this.data.buffer);

    get_velocity() {
        return new TerraVector3(engine.memory.buffer, this.gpu_pointer + 16 * Float32Array.BYTES_PER_ELEMENT)
    }
    get_translation() {
        return new TerraVector3(engine.memory.buffer, this.gpu_pointer + 12 * Float32Array.BYTES_PER_ELEMENT);
    }
    SetTranslationDelta(value: [number, number, number] | TerraVector3) {
        this.get_velocity().set(value);
        this.update_dynamic_buffer(engine.rustEngine);
    }

    SetTranslation(value: [number, number, number] | TerraVector3) {
        this.get_translation().set(value);
        this.update_dynamic_buffer(engine.rustEngine);
    }
    get bounding_min() {
        return new TerraVector3(engine.memory.buffer,super.bounding_min_pointer);
    }
    get bounding_max() {
        return new TerraVector3(engine.memory.buffer,super.bounding_max_pointer);
    }
   
    constructor(
        hasBounding: boolean,
        has_geometry:boolean,
        positionsCount = 0,
        vertices_stride = 3,
        point_light=0,
        directional_light=0,
        static_faces=false,
        strip=false,
        scenes?:Scene[]) {
        const sceneids=scenes?scenes.reduce((acc, scene) => acc | scene.id,0):1;
        super(engine.rustEngine, MainNode.uniqueID++, hasBounding, has_geometry, positionsCount, vertices_stride, point_light, directional_light, sceneids, static_faces, strip);
        Object.getOwnPropertyNames(MainNode.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(MainNode.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        MainNode.Meshes.set(this.id, this);
        queueMicrotask(() => {
            if (this.#hasPhysics()) {
                engine.physics.tickables.add(this);
            }
        });
        engine.updateAllocatedMemory();
    }
    override destroy() {
        super.destroy(engine.rustEngine);
        engine.updateAllocatedMemory();
    }
    #hasPhysics(): this is hasPhysics {
        return 'hasGravity' in this && 'onPhysicTick' in this;
    }
}
export abstract class TerraNodeGPU<T extends DrawableDirect> extends MainNode {

    // abstract Drawable:DrawableDirect
    static GPUDataSize = /*transform matrix */16 /*delta */ +4 /*custom */ +4 /* acceleration */ +4 /*id */ +1 /*point_light */ +1 /*directional_light*/ +1 /*scenes*/+1;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader
    abstract drawable: T;

    constructor(
        public renderPipeline: RenderPipeline,
        positionsCount: number,
        hasBounding = false,
        has_geometry = false,
        vertices_stride = 3,
        point_light = 0,
        directional_light=0,
        static_faces=false,
        strip=false,
        scenes?:Scene[]) {
        super(hasBounding, has_geometry, positionsCount, vertices_stride, point_light, directional_light, static_faces,strip,scenes);
        Object.getOwnPropertyNames(TerraNodeGPU.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(TerraNodeGPU.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        if (renderPipeline.dynamicBindGroupOffset.length)
            renderPipeline.dynamicBindGroupOffset[0] = this.gpu_alignment;
    }

    get verticesArray() {
        const arr:Float32Array[] = [];
        for (let i=0; i< this.vertices_count; i++) {
            arr.push(new Float32Array(engine.memory.buffer, this.vertices_pointer + i*Float32Array.BYTES_PER_ELEMENT*this.vertices_stride, this.vertices_stride))
        }
        return arr;
    }
}