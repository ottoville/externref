import type { RenderPass } from "./RenderPasses/RenderPass.js";
import type { BindGroup } from "./BindGroup.js";
import type { RenderPipelineLayout } from "./PipelineLayout.js";
import type { VertexShader } from "./Shaders/VertexShader.js";
import type { Shader } from "./Shaders/Shader.js";

export type RenderPipelineProps<V extends VertexShader> = {
    label: string,
    vertexShader: V,
    fragmentShader: Shader,
    renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
    depthBuffer?: {
        depthWriteEnabled: boolean, depthCompare: GPUCompareFunction
    },
    bindgroupdrawable: RenderPipelineLayout
}
export class RenderPipeline<V extends VertexShader = VertexShader> {

    dynamicBindGroupOffset: number[] = [];
    public createSharedBindGroups?: () => Set<BindGroup>;
    constructor(
        public props: Readonly<RenderPipelineProps<V>>,
    ) {
    }
    destroy(): void {
        this.props.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder,
        renderPass: RenderPass,
        BindGroupsStart: number,
        dynamicIndices: number[] = []): number {
        const variant = renderPass.renderPipelines.get(this);
        if (!variant) {
            console.warn('No renderPipelines has been set for renderpass', this.props.label, ', wont draw anything')
            return 0;
        }
        if(!('rootDrawables' in variant)) {
            //There is unresolved promise
            return 0;
        }
        var drawables = variant.rootDrawables;
        if (!drawables || drawables.size == 0) {
            console.warn('No drawables has been set for renderpass', this.props.label, ', wont draw anything')
            return 0;
        }

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