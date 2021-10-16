import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../RenderPipeLines/Simple.js";
import { GPU, GPUBufferUsage } from "../../GPU.js";
import { Engine } from "engine.js";
declare const engine:Engine;

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
function create(gpu: GPU): [Uint32Array, GPUIndexBuffer, GPUVertexBuffer] {
    const [indicesBuffer, iBuffer] = gpu.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ]));
    // const [verticesBuffer, vBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.VERTEX, new Float32Array());
    const vBuffer = gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: positions.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
    new Float32Array(vBuffer.getMappedRange()).set(positions);
    vBuffer.unmap();

    return [new Uint32Array(indicesBuffer), iBuffer, vBuffer]
}
let uid=0;
export class Box extends SimpleIndexedMesh {
    constructor(
        scenes?: Scene[],
        point_light = 0,
        label='box'+(uid++)
    ) {
        super(positions, ...create(engine.gpu),label,point_light, scenes);
    }
}