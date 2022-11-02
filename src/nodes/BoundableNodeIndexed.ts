import { type canCollideCharacter, DataNode } from "./DataNode.js";
import type { Engine } from "../engine.js";
import type { Scene } from "../Scene.js";
declare const engine: Engine;

export abstract class BoundableNodeIndexed extends DataNode implements canCollideCharacter {
    indices_count?= 0;
    set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        this.indices_count = indices.length;
        const ptr = engine.rust.alloc_vector_usize(indices.length);
        new Uint32Array(engine.rust.memory.buffer, ptr, indices.length).set(indices);

        const ptr_vertices = engine.rust.alloc_vector_f32(vertices.length);
        new Float32Array(engine.rust.memory.buffer, ptr_vertices, vertices.length).set(vertices);

        engine.rust.set_indices_and_vertices(this.ptr, ptr, indices.length, ptr_vertices, vertices.length);
        this.rebuildTrianglePlanes();
    }
    get indices() {
        const ptr = engine.rust.indices_pointer(this.ptr);
        return new Uint32Array(engine.rust.memory.buffer, ptr, this.indices_count ?? 0);
    }

    /*    set setFaces(faces:Float32Array) {
            this.faces=faces;
            this.rebuildTrianglePlanes();
        }*/
    constructor(
        vertices: Float32Array,
        verticesPositionStride = 3,
        indicesView: Uint32Array,
        can_collide = false,
        strip = false,
        point_light = 0,
        static_faces = false,
        label: string,
        scenes?: Scene[],
        frontFace: GPUFrontFace = 'cw',
        fixed = false,
        rigid_body = true,
        character_can_collide_to = true
    ) {
        super({
            vertices,
            verticesPositionStride,
            can_collide,
            strip,
            point_light,
            static_faces,
            label,
            scenes,
            frontFace,
            fixed,
            rigid_body,
            character_can_collide_to
        });
        this.set_indices_and_vertices(indicesView, vertices);
    }
    override set_vertices(vertices: Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if (!this.initCollider())
            return;
        this.indices.forEach((indice: number) => {
            const position = this.colliderVerticesV4[indice]
            if (typeof (position) === 'undefined') {
                throw (new Error('position ' + indice + ' not found'));
            }
            this.pushVertice(position)
        });
        this.buildFaces();
    }
}