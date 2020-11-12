import { TerraScene } from "TerraScene";
import { RenderPipeline } from "../../GPU/RenderPipeline";
import { Simple } from "../../GPU/RenderPipeLines/Simple";
import { TerraNode } from "../../TerraNode";
import { boundable, Bounding } from "../../traits/Boundable";
import { worldPosition } from "../../traits/worldPosition";

export class testbox extends TerraNode implements boundable {
    worldPosition: worldPosition = new worldPosition(this);
    bounding: Bounding = new Bounding(this);
    indicesBuffer: SharedArrayBuffer
    verticesPositionBuffer: SharedArrayBuffer;
    verticesPositionStride = 3;
    constructor(scene: TerraScene) {
        super(scene);
        let vBuffer: GPUVertexBuffer;
        [this.verticesPositionBuffer, vBuffer] = scene.gpuscene.createInputBuffer(GPUBufferUsage.VERTEX, new Float32Array([
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0,
        ]))
        let iBuffer: GPUIndexBuffer;
        [this.indicesBuffer, iBuffer] = scene.gpuscene.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,   // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23,   // left
        ]))
        this.worldPosition.update(scale => scale.set([200, 200, 200]));
        (async () => {
            const renderpipeline = await Simple(scene.gpuscene);
            const m = renderpipeline.addDrawable([scene.gpuscene.renderPassScreen], 36)
            m.dynamicBuffers.set(scene.gpuscene.BindGroup, this.bufferOffset);
            m.setVertexBuffer(0, vBuffer);
            m.setIndexBuffer(iBuffer);
        })()




    }
}