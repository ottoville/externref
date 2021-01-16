import { Scene } from "../../Scene";
import { BoundableNode } from "../../TerraNode";
import { worldPosition } from "../../traits/worldPosition";



export class testPlane extends BoundableNode {
    worldPosition: worldPosition = new worldPosition(this);

    constructor(scene: Scene) {
        //@ts-ignore
        super(scene, new SharedArrayBuffer(7 * 3 * 4),undefined,undefined,undefined,true)
        this.boundingBox.box.set([0, 0, 0, 200, 200, 0])
        new Float32Array(this.verticesPositionBuffer).set([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0,
            1, 1, 0,
            0, 2, 0,
            1, 2, 0,
            0, 3, 0]);
        const vBuffer = scene.gpu.createGPUBuffer(this.verticesPositionBuffer.byteLength, [GPUBufferUsage.VERTEX], true);
        new Float32Array(vBuffer.getMappedRange()).set(new Float32Array(this.verticesPositionBuffer));
        vBuffer.unmap();
        this.worldPosition.update(scaling => {
            scaling.set([200, 200, 200]);
        })
        /*const testPlaneRenderpipeline = this.scene.lightsBindGroup.addRenderPipeline({
            rasterizationState: {
                cullMode: 'none',
            },
            primitiveTopology: 'triangle-strip',
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: this.scene.gpu.shaderModules.get("testPlane.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: this.scene.gpu.shaderModules.get("testPlane.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                indexFormat: 'uint16', //todo: this is not needed as shader does not use indexes.
                vertexBuffers:
                    [{
                        arrayStride: 4 * 3,
                        stepMode: "vertex",
                        attributes: [{
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float3"
                        }]
                    }]
            }
        });
        const m = testPlaneRenderpipeline.addDrawable([scene.gpu.renderPassScreen], 7)
        m.setVertexBuffer(0, vBuffer)
        testPlaneRenderpipeline.properties = 1;*/
    }
}

export class testPlaneNormals {

    constructor() {
        /* const renderPipeline = this.scene.lightsBindGroup.addRenderPipeline({
             rasterizationState: {
                 cullMode: 'none',
             },
             primitiveTopology: 'line-list',
             colorStates: [{
                 format: "bgra8unorm",
             }],
             vertexStage: {
                 module: this.scene.gpu.shaderModules.get("testPlaneNormals.vert")!,
                 entryPoint: "main",
             },
             fragmentStage: {
                 module: this.scene.gpu.shaderModules.get("testPlaneNormals.frag")!,
                 entryPoint: "main"
             }
         });
         renderPipeline.addDrawable([scene.gpu.renderPassScreen],14)
         renderPipeline.properties = 1;*/
    }
}