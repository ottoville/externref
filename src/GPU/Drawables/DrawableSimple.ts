import type { Engine } from '../../engine.js';
import { DrawableDirect, DrawableDirectProps, type MappedVertexBuffers } from './DrawableDirect.js';
import { MainNode } from '../../MainNode.js';
import type { BindGroup } from '../BindGroup.js';
import { RenderPipeline } from '../RenderPipeline.js';
import { DrawableProps } from './Drawable.js';
declare const engine: Engine;

export class DrawableSimple<const R extends RenderPipeline> extends DrawableDirect<MainNode> {
    #firstVertex = 0;
    constructor(
        drawableProps: Omit<DrawableProps<MainNode>, 'label'> & {
            renderPipeline: R;
            vertexBuffers: MappedVertexBuffers<R>
        },
        drawableDirectProps?: DrawableDirectProps,
        {
            firstVertex = 0,
        }
            :
            {
                firstVertex?: number;

            } = {}
    ) {
        const dynamicIndex = engine.rust.gpu_alignment(drawableProps.node.id);
        const dynamicBindGroups: [BindGroup, number][] = [[drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, dynamicIndex]]

        super(
            {
                ...drawableProps,
                dynamicBindGroups,
            }, drawableDirectProps);
        this.#firstVertex = firstVertex;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.#firstVertex, this.firstInstance);
    }
}