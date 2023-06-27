import type { Engine } from "../../engine.js";
import { MainNodeProps, new_rust_mesh } from "../../MainNode.js";
import { MutableTerraVector3 } from "../../Math.js";
import { allocate_vec } from "../../nodes/DataNode.js";
import { IndexedSingleColoredMesh } from "../AbstractMeshes/IndexedSingleColoredMesh.js";
declare const engine: Engine;

const douplePI = Math.PI * 2;
function strip2List(indices: Uint32Array) {
    const list = new Uint32Array((indices.length - 2) * 3);
    const triangle: number[] = [];
    for (let i = 0; i < indices.length; i++) {
        if (triangle.push(indices[i]!) === 3) {
            if (i % 2 === 1) {
                triangle.reverse();
            }
            list.set(triangle, (i - 2) * 3);
            if (i % 2 === 1) {
                triangle.reverse();
            }
            triangle.shift();
        }
    }
    return list;
}
function createCircle(faces = 14, cullMode: -1 | 1 = 1, stride = 6) {
    const vertices = new Float32Array((faces + 2) * stride);
    const indices = new Uint32Array(faces + 2);

    const edges = faces + 2;
    const facelen = douplePI / edges;
    let progress = facelen;
    let x = cullMode * Math.sin(progress);
    let z = Math.cos(progress);
    vertices.set(
        [
            0, 0, 1, 1, /* normals: */ 0, 0, 0, 1,
            x, 0, z, 1, /* normals: */ 0, 0, 0, 1,
        ]);
    indices.set([0, 1]);
    progress += facelen;
    for (let i = 0; i < faces; i++) {
        indices[i + 2] = i + 2;
        if (i % 2 === 0) {
            vertices.set(
                [-x, 0, z, 1, /* normals: */ 0, 0, 0, 1], (i + 2) * stride);
        } else {
            x = cullMode * Math.sin(progress);
            z = Math.cos(progress);
            vertices.set(
                [x, 0, z, 1,/* normals: */ 0, 0, 0, 1], (i + 2) * stride);
            progress += facelen;
        }
    }
    // normalize vertices
    for (let i = 0; i < vertices.length; i += stride) {
        new MutableTerraVector3(vertices.buffer, i * Float32Array.BYTES_PER_ELEMENT).normalize();
    }
    return [vertices, indices] as const;
}
function createCone(faces = 14, stride = 6): readonly [vertices: Float32Array, indices: Uint32Array] {
    if (faces % 2 !== 0) {
        throw (new Error("Cone must not have odd number of faces"));
    }
    const [circleVertices, circleIndices] = createCircle(faces, -1, stride);
    const coneVertices = Array.from(circleVertices);
    //Lover the vertices to keep 0,0 coordinate in middle.
    for (let i = 0; i < coneVertices.length; i = i + stride) {
        coneVertices[i + 1] = -1;
    }
    const zeroIndice = coneVertices.push(0, 1, 0, 1,  /* normals: */0, 0, 0, 1) / stride - 1;

    let indicesOrder = [0];
    const indicesOrder2: number[] = [];
    for (let i = 1; i < faces + 3; i++) {
        if (i % 2 === 1)
            indicesOrder.push(i);
        else
            indicesOrder2.push(faces + 2 - i);
    }
    indicesOrder = indicesOrder.concat(indicesOrder2);
    const coneIndices = Array.from(strip2List(circleIndices));
    const window: number[] = [];
    for (let i = 0; i < indicesOrder.length; i++) {
        if (window.push(indicesOrder[i]!) === 2) {
            coneIndices.push(window[1]!, window[0]!, zeroIndice,);
            window.shift();
        }
    }
    return [Float32Array.from(coneVertices), Uint32Array.from(coneIndices)] as const;
}
export class Cone extends IndexedSingleColoredMesh {
    constructor(
        mainNodeProps: Omit<MainNodeProps, 'strip'>,
        can_collide = false,
        color: [number, number, number, number] = [1, 0, 0, 0]
    ) {
        const [vertices, indices] = createCone(14, 8);
        const mesh_id = new_rust_mesh(mainNodeProps);
        super(
            {
                can_collide,
                vertices: {
                    stride: 8,
                    view: allocate_vec(vertices),
                },
            },
            mesh_id,
            allocate_vec(indices));
        this.color = color;
    }
    override create_collider() {
        return engine.rust.create_cone_collider(this.scale_y, this.radius);
    }
    get radius() {
        return this.scale_x;
    }
    set radius(radius: number) {
        this.update_scale(radius, this.scale_y, radius);
        const collider_ptr = engine.rust.create_cone_collider(this.scale_y, radius);
        engine.rust.add_collider(this.id, collider_ptr);
    }
}