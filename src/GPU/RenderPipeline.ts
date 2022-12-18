import type { PipelineLayout } from "./PipelineLayout.js";
import type { RenderPass } from "./RenderPasses/RenderPass.js";
import type { GPU } from "../GPU.js";
import type shaders from "../shaders.json";
import { BindGroup } from "./BindGroup.js";

export class Shader {
    module: GPUShaderModule;
    constructor(gpu: GPU, shader: keyof typeof shaders) {
        const module = gpu.shaderModules[shader];
        if (!module)
            throw (new Error('shader ' + shader + ' not found'));
        this.module = module;
    }
}
type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];
export class VertexShader<B extends VertexBuffers = VertexBuffers> extends Shader {
    buffers: B;
    constructor(gpu: GPU, shader: keyof typeof shaders, buffers: B) {
        super(gpu, shader);
        this.buffers = buffers;
    }
}
export class RenderPipeline<V extends VertexShader = VertexShader> {

    dynamicBindGroupOffset: number[] = [];
    public createSharedBindGroups?: () => Set<BindGroup>;
    constructor(
        public label: string,
        public vertexShader: V,
        public fragmentShader: Shader,
        public renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'vertex' | 'fragment' | 'layout'>,
        public bindgroupdrawable: PipelineLayout,
        public depthBuffer?: { depthWriteEnabled: boolean, depthCompare: GPUCompareFunction },
    ) {
    }
    destroy(): void {
        this.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder,
        renderPass: RenderPass,
        BindGroupsStart: number,
        dynamicIndices: number[] = []): number {
        const variant = renderPass.renderPipelines.get(this)
        if (!variant) {
            console.warn('No renderPipelines has been set for renderpass', this.label, ', wont draw anything')
            return 0;
        }
        var drawables = variant.rootDrawables;
        if (!drawables || drawables.size == 0)
            return 0;

        renderPassEncoder.setPipeline(variant.renderpipeline);
        //variant.renderpipeline.label && console.log('set Pipeline ', variant.renderpipeline.label)
        if (this.createSharedBindGroups) {
            this.createSharedBindGroups().forEach(bindgroup => {
                renderPassEncoder.setBindGroup(BindGroupsStart++, bindgroup.bindGroup)
            });
        }
        drawables.forEach(drawable => drawable.draw(renderPassEncoder, BindGroupsStart, dynamicIndices));
        return drawables.size;
    }
}