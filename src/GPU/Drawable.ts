import { RenderPipeline, Shader, VertexShader } from "./RenderPipeline.js";
import type { GPU } from "../GPU.js";
import type { RenderPass } from "./RenderPass.js";
import type { Scene } from "../Scene.js";
import { TerraNodeGPU } from "../TerraNode.js";
import { GPUBufferUsage } from "../GPU.js"
import type { IndexedNode } from "../DataNode.js";
type DrawableLike = typeof RenderPipeline;
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<RenderPipeline>;
    Layouts: Map<GPU, GPUPipelineLayout>;
    createLayout(scene: GPU): GPUPipelineLayout;
}

export abstract class Drawable {
    abstract label:string;
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    dynamicBuffers: [GPUBindGroup, number][] = [];
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    #scene?: Scene;
    constructor(
        protected renderPipeline: RenderPipeline,
        protected renderPasses: Set<RenderPass>,
        scene?: Scene) {
        this.scene = scene;
        this.clearBundles();
    }

    set scene(scene: Scene | undefined) {
        if (this.#scene) {
            this.#renderList.forEach(Drawables => Drawables.delete(this));
        }
        this.#scene = scene;
        this.createPipelinesForRenderPasses();
    }
    createPipelinesForRenderPasses() {
        this.renderPasses.forEach(rp => {
            const variant = rp.getVariant(this.renderPipeline);
            this.#renderList.set(rp, variant.rootDrawables.add(this));
        });
        this.clearBundles();
    }
    staticBuffers?:GPUBindGroup;
    setStaticBuffer(...staticBuffers:(GPUSampler | GPUTextureView)[]) {
        this.clearBundles();
        this.staticBuffers= this.renderPipeline.bindgroupdrawable.gpu.device.createBindGroup(
            {
                layout: this.renderPipeline.bindgroupdrawable.bindGroupLayout.layout,
                entries: staticBuffers.map((resource, binding) => {
                    return {
                        binding,
                        resource
                    }
                })
            })
    }
    protected clearBundles() {
        this.renderPasses.forEach(rp => rp.bundles.length = 0);
    }
    destroy(preserveVerticeBuffers: number[] = []): void {
        this.#renderList.forEach(Drawables => Drawables.delete(this));
        this.clearBundles();
        this.#vertexBuffers.forEach((b, key) => {
            if (!preserveVerticeBuffers.includes(key))
                b.buffer.destroy()
        });
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): GPUVertexBuffer
    setVertexBuffer<T extends GPUVertexBuffer>(index: number, buffer: T, destroyOld?: boolean, offset?: number, size?: number): T
    setVertexBuffer(index: number, buffer: ArrayBufferView | GPUVertexBuffer, destroyOld = true, offset?: number, size?: number): GPUVertexBuffer {
        if (destroyOld) {
            const Tbuffer = this.#vertexBuffers.get(index);
            if (Tbuffer) {
                Tbuffer.buffer.destroy();
                this.clearBundles();
            }
        }
        if (buffer instanceof GPUBuffer)
            var Tbuffer = buffer;
        else {
            var Tbuffer = this.renderPipeline.bindgroupdrawable.gpu.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.VERTEX], true)
            new Uint8Array(Tbuffer.getMappedRange()).set(new Uint8Array(buffer.buffer));
            Tbuffer.unmap();
        }
        this.#vertexBuffers.set(index, { buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    abstract render: (renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass) => void
    draw(renderPass: RenderPass, renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number, dynamicIndex:number[]) {
        this.dynamicBuffers.forEach((gpubindgroup_offset, i) => {
            const di=dynamicIndex[i];
            if(di) {
                renderEncoder.setBindGroup(di, gpubindgroup_offset[0], [this.renderPipeline.bindgroupdrawable.gpu.gpu_memory_index_size + gpubindgroup_offset[1] * TerraNodeGPU.alignment]);
            }
        });
        this.staticBuffers && renderEncoder.setBindGroup(BindGroupsStart++, this.staticBuffers)

        this.#vertexBuffers.forEach((buffer, index) => renderEncoder.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        this.render(renderEncoder, renderPass);
    }
}
export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        scene?: Scene,
        instanceCount = 1) {

        super(renderPipeline, renderPasses, scene);
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
    }
    set instanceCount(count: number) {
        if (count === this.#instanceCount)
            return;
        this.#instanceCount = count;
        this.clearBundles();
    }
    get instanceCount() {
        return this.#instanceCount;
    }
}
export class DrawableIndirect<T extends GPUIndirectBuffer> extends Drawable {
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        readonly buffer: T,
        public label: string,
        scene?: Scene,) {
        super(renderPipeline, renderPasses, scene);
    }
    render = (renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        renderEncoder.drawIndirect(this.buffer, 0);
    }
}
export class DrawableSimple extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        private node: TerraNodeGPU<DrawableSimple>,
        public label:string,
        scene?: Scene,
        instanceCount = 1,
        public firstVertex = 0,
        public firstInstance = 0) {
        super(renderPipeline, renderPasses, scene, instanceCount);
    }
    render = (renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.firstVertex, this.firstInstance);
    }
}

const renderPipelines: Map<GPU, RenderPipeline> = new Map();
function DebugNormalsPipeline(gpu: GPU, entryPoint='main', topology:GPUPrimitiveTopology='line-list') {
    const renderPipeline = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;

    const renderPipeLine = gpu.lightsBindGroupTexture2.addRenderPipeline(new VertexShader(gpu,'debug_normals.vert.wgsl', entryPoint, [{
        arrayStride: 48,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        },
        {
            // normals
            shaderLocation: 1,
            offset: 16,
            format: "float32x3"
        }
        ]
    }]), new Shader(gpu,'ground.frag.wgsl',entryPoint), {
        label: 'terrain',
        primitive: { topology }
    });
    renderPipelines.set(gpu, renderPipeLine);
    return renderPipeLine;
}

export class DrawableIndexed extends DrawableDirect {
    normalsPipeline?: RenderPipeline;
    debugMode=false;
    debug_render_normals_vertexBuffer?: GPUVertexBuffer;
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        private node: IndexedNode,
        public label:string,
        private indexBuffer?: GPUIndexBuffer,
        scene?: Scene,
        public baseVertex = 0,
        instanceCount = 1,
        public firstIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16',
        ) {
        super(renderPipeline, renderPasses, scene, instanceCount);
    }
    debug_render_normals() {
        const gpu = this.renderPipeline.bindgroupdrawable.gpu;
        this.normalsPipeline=DebugNormalsPipeline(gpu,'normals');
        const vertices = this.node.verticesArray;
        const stride=this.node.vertices_stride;

        this.debug_render_normals_vertexBuffer = gpu.createGPUBuffer(this.node.positions_count*stride*2*Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], true);
        const view = new Float32Array( this.debug_render_normals_vertexBuffer.getMappedRange());
        vertices.forEach((v,i) => {
            view.set(v,i*stride*2)
            view.set(v,i*stride*2+stride)
        })
        this.debug_render_normals_vertexBuffer.unmap();
        this.debugMode=true;
        this.clearBundles();

    }
    override destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
        super.destroy(preserveVerticeBuffers);
        if (!preserveIndexBuffer && this.indexBuffer)
            this.indexBuffer.destroy();
    }
    setIndexBuffer(buffer: GPUIndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | GPUIndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
        this.baseVertex = baseVertex;
        if (destroyOld && this.indexBuffer) {
            this.indexBuffer.destroy();
            this.clearBundles();
        }
        if (buffer instanceof GPUBuffer) {
            this.indexBuffer = buffer;
            GPUIndexFormat && (this.GPUIndexFormat = GPUIndexFormat);
        }
        else {
            this.indexBuffer = this.renderPipeline.bindgroupdrawable.gpu.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
            if (buffer.BYTES_PER_ELEMENT == 4) {
                new Uint32Array(this.indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint32';
            } else {
                new Uint16Array(this.indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint16';
            }
            this.indexBuffer.unmap();
        }
        return this.indexBuffer;
    }
    render = (renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass:RenderPass) => {
        if (this.indexBuffer) {
            renderEncoder.setIndexBuffer(this.indexBuffer, this.GPUIndexFormat);
            renderEncoder.drawIndexed(this.node.indices_count, this.instanceCount, this.firstIndex, this.baseVertex, this.firstInstance);
            if(this.debugMode) {
                renderEncoder.setPipeline(renderPass.getVariant(this.normalsPipeline!).renderpipeline);
                renderEncoder.setVertexBuffer(0,this.debug_render_normals_vertexBuffer!);
                renderEncoder.draw(this.node.positions_count*2, this.instanceCount, this.firstIndex,this.baseVertex);
                console.log('draw in debugMode',this.node.positions_count*2,this.instanceCount,this.firstIndex,this.baseVertex, this.firstInstance)
            }
        }
    }
}