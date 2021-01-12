import { Scene } from "../../Scene";
import { SimpleMesh } from "../RenderPipeLines/Simple";

export class Box extends SimpleMesh {
    iBuffer: GPUIndexBuffer;
    vBuffer: GPUVertexBuffer;
    static create(scene: Scene) {
        const [indicesBuffer, iBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,   // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23,   // left
        ]));
        return new Box(scene, indicesBuffer, iBuffer)
    }

    constructor(scene: Scene, CPUIndexBuffer: SharedArrayBuffer, GPUIndexBuffer: GPUIndexBuffer) {
        super(scene, new SharedArrayBuffer(6 * 4 * 3 * 4), 'uint32', CPUIndexBuffer);
        new Float32Array(this.verticesPositionBuffer).set([
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
        ]);

        this.vBuffer = scene.gpu.createInputBuffer(GPUBufferUsage.VERTEX, this.verticesPositionBuffer);
        this.iBuffer = GPUIndexBuffer;
        this.boundingBox.box.set([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0])
    }
}