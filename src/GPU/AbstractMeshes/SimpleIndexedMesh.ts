import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableIndexed } from "../Drawable.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { GPUBufferUsage } from "../../GPU.js";
import { Buffer, IndexBuffer, VertexBuffer } from "../../GPU/Buffer.js";
declare const engine:Engine;

export abstract class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed | undefined;
    constructor(
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        label:string,
        iBuffer?: IndexBuffer,
        vBufferGPU?: VertexBuffer,
        point_light=0,
        has_physic = false,
        scenes?: Scene[],
        frontFace: GPUFrontFace = 'cw',
        topology: GPUPrimitiveTopology = "triangle-list",
        fixed = false
        ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super(vBufferCPU, 6, indicesView, has_physic, strip, point_light, undefined, label, scenes, frontFace,fixed);
        const primitiveState:GPUPrimitiveState = {frontFace, topology};
        if(strip)
            primitiveState.stripIndexFormat = 'uint32';
        if(engine.gpu) {
            this.drawable = engine.gpu.createRenderPipeline(SimpleRenderPipeline, primitiveState
            ).addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.pickRenderPass, engine.gpu.renderPassWater]))
            if(!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, vBufferCPU.byteLength, [GPUBufferUsage.VERTEX],  'vertex_'+label, b => {
                    new Float32Array(b.getMappedRange()).set(vBufferCPU);    
                });
            }
            this.drawable!.setVertexBuffer(0, vBufferGPU);
            if(!iBuffer) {
                iBuffer = Buffer.create(engine.gpu, indicesView.byteLength, [GPUBufferUsage.INDEX],  'index_'+label, b => {
                    new Uint32Array(b.getMappedRange()).set(indicesView);
                })
            }
            this.drawable!.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');
        }

    }
}