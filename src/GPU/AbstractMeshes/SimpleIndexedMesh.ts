import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableIndexed } from "../Drawable.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { GPU } from "../../GPU.js";
declare const engine:Engine;

export abstract class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable:DrawableIndexed;
    constructor(
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        label:string,
        iBuffer?: GPUIndexBuffer,
        vBufferGPU?: GPUVertexBuffer,
        point_light=0,
        has_physic = false,
        scenes?: Scene[],
        frontFace: GPUFrontFace = 'cw',
        ) {
        super(vBufferCPU, 6, indicesView, has_physic, undefined, point_light, undefined, label, scenes, frontFace);

        this.drawable =  GPU.createRenderPipeline(SimpleRenderPipeline, {frontFace}).addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.pickRenderPass]))
        if(!vBufferGPU) {
            vBufferGPU = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: vBufferCPU.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
            new Float32Array(vBufferGPU.getMappedRange()).set(vBufferCPU);
            vBufferGPU.unmap();
        }
        this.drawable.setVertexBuffer(0, vBufferGPU);
        if(!iBuffer) {
            iBuffer = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.INDEX, size: indicesView.byteLength, mappedAtCreation: true }) as GPUIndexBuffer;
            new Uint32Array(iBuffer.getMappedRange()).set(indicesView);
            iBuffer.unmap();
        }
        this.drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}