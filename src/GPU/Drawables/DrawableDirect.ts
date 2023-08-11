import type { RenderPipeline } from '../RenderPipeline.js';
import type { VertexShader } from '../Shaders/VertexShader.js';
import { Drawable, type DrawableProps } from './Drawable.js';
import type { MainNode } from '../../MainNode.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import { VertexShaderFunction } from '../Shaders/ShaderFunction.js';
import { type BGLayout } from '../BindGroupLayout.js';
import { Buffer2, type VERTEX_BUFFER } from '../Buffer/Buffer2.js';
declare const engine: Engine;

export type MappedVertexBuffers<R extends RenderPipeline, B extends readonly BGLayout[] = readonly BGLayout[]> = R extends RenderPipeline<infer VERTEX_SHADER> ? (
    //extract VertexBuffers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    VERTEX_SHADER extends VertexShader<{ main:  VertexShaderFunction<B, infer V> }> ? (
        Readonly<{
            [Property in keyof V]: { view: rust_vec_ptr<'f32'> | Buffer2<VERTEX_BUFFER>, stride: number };
        }>
    ) : []
) : never

export type DrawableDirectProps = {
    instanceCount?: number;
    firstInstance?: number;
    /**
     * Force only this amount of positions to drawn.
     * If not set, use vertexbuffer length by default
     */
    positionsCount?: number;
}

export abstract class DrawableDirect<N extends MainNode> extends Drawable<N> {
    constructor(
        drawableProps: DrawableProps<N>,
        {
            instanceCount = 1,
            firstInstance = 0,
        }: DrawableDirectProps = {
        }
    ) {
        super(drawableProps);
        engine.rust.set_drawble_direct(this.node.id,
            instanceCount,
            firstInstance);
    }
    protected set firstInstance(first_instance: number) {
        engine.rust.set_first_instance(this.node.id,
            first_instance);
    }
    protected get firstInstance() {
        return engine.rust.get_first_instance(this.node.id);
    }
    protected set instanceCount(count: number) {
        engine.rust.set_instance_count(this.node.id,
            count);
    }
    protected get instanceCount() {
        return engine.rust.get_instance_count(this.node.id);
    }
}