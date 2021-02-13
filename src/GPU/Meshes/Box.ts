import type { Scene } from "../../Scene.js";
import { SimpleMesh } from "../RenderPipeLines/Simple.js";
function create(scene: Scene): [SharedArrayBuffer, Uint32Array, GPUIndexBuffer, GPUVertexBuffer] {
    const [indicesBuffer, iBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ]));
    const [verticesBuffer, vBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.VERTEX, new Float32Array([
        // Left face
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        -1.0, -1.0, 1.0,
        -1.0, -1.0, -1.0,
        // Right face
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Bottom face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,

        // Top face
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0,
        // Back face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        -1.0, 1.0, -1.0,
        -1.0, -1.0, -1.0,

        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,
    ]));
    return [verticesBuffer, new Uint32Array(indicesBuffer), iBuffer, vBuffer]
}
export class Box extends SimpleMesh {
    constructor(
        scene: Scene,
    ) {
        super(scene, ...create(scene));
        this.boundingBox.box.set([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
    }
}