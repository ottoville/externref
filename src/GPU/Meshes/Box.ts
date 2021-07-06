import type { Scene } from "../../Scene.js";
import { SimpleMesh } from "../RenderPipeLines/Simple.js";
import { GPUBufferUsage } from "../../GPU.js";

const positions = new Float32Array([
    // Left face        //normals
    -1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
    -1.0, -1.0, -1.0,   0.0,1.0,0.0,
    // Right face
    1.0, -1.0, 1.0,     0.0,1.0,0.0,
    1.0, 1.0, 1.0,      0.0,1.0,0.0,
    1.0, 1.0, -1.0,     0.0,1.0,0.0,
    1.0, -1.0, -1.0,    0.0,1.0,0.0,

    // Bottom face
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
    1.0, -1.0, 1.0,     0.0,1.0,0.0,
    1.0, -1.0, -1.0,    0.0,1.0,0.0,
    -1.0, -1.0, -1.0,   0.0,1.0,0.0,

    // Top face
    1.0, 1.0, -1.0,    0.0,1.0,0.0,
    1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, 1.0, 1.0,    0.0,1.0,0.0,
    -1.0, 1.0, -1.0,   0.0,1.0,0.0,
    // Back face
    1.0, -1.0, -1.0,   0.0,1.0,0.0,
    1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, -1.0,   0.0,1.0,0.0,
    -1.0, -1.0, -1.0,  0.0,1.0,0.0,

    -1.0, 1.0, 1.0,    0.0,1.0,0.0,
    1.0, 1.0, 1.0,     0.0,1.0,0.0,
    1.0, -1.0, 1.0,    0.0,1.0,0.0,
    -1.0, -1.0, 1.0,   0.0,1.0,0.0,
])
function create(scene: Scene): [number, Uint32Array, GPUIndexBuffer, GPUVertexBuffer] {
    const [indicesBuffer, iBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ]));
    // const [verticesBuffer, vBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.VERTEX, new Float32Array());
    const vBuffer = scene.gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: positions.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
    new Float32Array(vBuffer.getMappedRange()).set(positions);
    vBuffer.unmap();

    return [24, new Uint32Array(indicesBuffer), iBuffer, vBuffer]
}
export class Box extends SimpleMesh {
    constructor(
        scene: Scene,
        point_light = 0
    ) {
        super(scene, ...create(scene),point_light);
        this.update_vertices(positions);
    }
}