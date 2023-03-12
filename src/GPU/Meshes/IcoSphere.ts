import type { Scene } from "../../Scene.js";
import type { Engine } from "../../engine.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import { MutableTerraVector3 } from "../../Math.js";
declare const engine: Engine;
let v = 12;
const midCache = new Map<number, number>(); // midpoint vertices cache to avoid duplicating shared vertices
function addMidPoint(vertices: Float32Array, a: number, b: number) {
    const key = Math.floor((a + b) * (a + b + 1) / 2) + Math.min(a, b); // Cantor's pairing function
    const i = midCache.get(key);
    if (i !== undefined) {
        midCache.delete(key);
        return i;
    }
    midCache.set(key, v);
    vertices[3 * v + 0] = (vertices[3 * a + 0]! + vertices[3 * b + 0]!) / 2;
    vertices[3 * v + 1] = (vertices[3 * a + 1]! + vertices[3 * b + 1]!) / 2;
    vertices[3 * v + 2] = (vertices[3 * a + 2]! + vertices[3 * b + 2]!) / 2;
    return v++;
}
const icosphere = (order = 0) => {
    // set up a 20-triangle icosahedron
    const f = 1.618033988749895 // (1 + 5 ** 0.5) / 2;
    const T = 4 ** order;

    const vertices = new Float32Array((10 * T + 2) * 3);
    vertices.set(Float32Array.of(
        -1, f, 0,   //0.
        1, f, 0,    //1.
        -1, -f, 0,  //2.
        1, -f, 0,   //3
        0, -1, f,   //4.
        0, 1, f,    //5.
        0, -1, -f,  //6.
        0, 1, -f,   //7.
        f, 0, -1,   //8.
        f, 0, 1,    //9.
        -f, 0, -1,  //10.
        -f, 0, 1)); //11.
    let triangles = Uint32Array.of(
        0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
        11, 10, 2, 5, 11, 4, 1, 5, 9, 7, 1, 8, 10, 7, 6,
        3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
        9, 8, 1, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7);

    v = 12;
    midCache.clear();

    let trianglesPrev = triangles;
    for (let i = 0; i < order; i++) {
        // subdivide each triangle into 4 triangles
        triangles = new Uint32Array(trianglesPrev.length * 4);
        for (let k = 0; k < trianglesPrev.length; k += 3) {
            const v1 = trianglesPrev[k + 0]!;
            const v2 = trianglesPrev[k + 1]!;
            const v3 = trianglesPrev[k + 2]!;
            const a = addMidPoint(vertices, v1, v2);
            const b = addMidPoint(vertices, v2, v3);
            const c = addMidPoint(vertices, v3, v1);
            let t = k * 4;
            triangles[t++] = v1; triangles[t++] = a; triangles[t++] = c;
            triangles[t++] = v2; triangles[t++] = b; triangles[t++] = a;
            triangles[t++] = v3; triangles[t++] = c; triangles[t++] = b;
            triangles[t++] = a; triangles[t++] = b; triangles[t++] = c;
        }
        trianglesPrev = triangles;
    }
    // normalize vertices
    for (let i = 0; i < vertices.length; i += 3) {
        new MutableTerraVector3(vertices.buffer, i * Float32Array.BYTES_PER_ELEMENT).normalize();
    }
    return [vertices, triangles] as [vertices: Float32Array, indices: Uint32Array];
}

let uid = 0;
export class IcoSphere extends SimpleIndexedMesh {
    override create_collider() {
        return engine.rust.create_ball_collider(this.scale_x);
    }
    set radius(radius: number) {
        this.update_scale(radius, radius, radius);
        const collider_ptr = engine.rust.create_ball_collider(radius);
        engine.rust.add_collider(this.ptr, collider_ptr);
    }
    constructor({
        order = 0,
        label = 'sphere' + (uid++),
        can_collide = false,
        fixed = false,
        scenes,
    }: {
        order?: number,
        label?: string,
        can_collide?: boolean,
        fixed?: boolean
        scenes?: Scene[]
    }
    ) {
        const [vertices, indices] = icosphere(order);
        const verticesAndNormals = new Float32Array(vertices.length * 2);
        for (let i = 0; i < vertices.length / 3; i++) {
            verticesAndNormals[i * 6] = vertices[i * 3]!;
            verticesAndNormals[i * 6 + 1] = vertices[i * 3 + 1]!;
            verticesAndNormals[i * 6 + 2] = vertices[i * 3 + 2]!;

            verticesAndNormals[i * 6 + 3] = vertices[i * 3]!;
            verticesAndNormals[i * 6 + 4] = vertices[i * 3 + 1]!;
            verticesAndNormals[i * 6 + 5] = vertices[i * 3 + 2]!;
        }
        super(
            {
                vertices: verticesAndNormals,
                can_collide,
                frontFace: 'ccw'
            },
            {
                label,
                scenes,
                fixed
            }
            , indices)
    }
}