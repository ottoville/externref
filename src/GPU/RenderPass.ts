import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import { GPUBufferUsage, type GPU } from "../GPU.js";
import type { RenderPipeline } from "./RenderPipeline.js";
import type { Drawable } from "./Drawable.js";
import type { RenderTarget } from "./RenderTargets/RenderTarget.js";
import { PipelineLayout } from "./PipelineLayout.js";
import { GPUTextureUsageLiterals, Texture } from "./texture.js";
import { TerraVector3 } from "../Math.js";
import type { Engine } from "../engine.js";
import { MainNode } from "../MainNode.js";
import { TextureView } from "./TextureView.js";
import { MSAARenderTarget } from "./RenderTargets/MSAARenderTarget.js";

declare const engine:Engine;

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass<T extends { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> } = { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> }> {
    /* Either cameras or bindGroupCanvas*/
    cameras: Set<TerraCamera> = new Set();
    BindGroupCanvas?: () => GPUBindGroup;

    scenes: Set<Scene> = new Set();
    bundles: GPURenderBundle[] = [];
    renderPipelines: Map<Readonly<RenderPipeline>, RenderPipelineVariant2> = new Map();
    sizeBindGroup: () => GPUBindGroup;
    #sizeBuffer: GPUUniformBuffer;
    
    constructor(
        public gpu: GPU,
        public renderTargets: T,
        public sampleCount: 1 | 4,
        public size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        private _onResize: (width: number, height: number) => [number, number],
        private entryPoint: string,
        public rootLayout: PipelineLayout,
        protected label:string
        ) {
        for (const rt of Object.values(renderTargets)) {
            rt.texture.renderPasses.add(this);
            rt.resize(this);
        }
        this.#sizeBuffer=this.updateSizeBindGroup(true);
        this.sizeBindGroup = () => gpu.sizeBindGroupLayout.createBindGroup('sizeBindGroup', [{
            binding: 0,
            resource: {
                buffer: this.#sizeBuffer,
                size: 16,
                offset: 0
            }
        }]);
    }
    updateSizeBindGroup(initial = false) {
        if (!initial)
            this.#sizeBuffer.destroy();
        this.#sizeBuffer = this.gpu.createGPUBuffer(this.gpu.gpu_screen_buffer_size, [GPUBufferUsage.UNIFORM], true, 'screen_buffer');
        const uniformbuffer = this.#sizeBuffer.getMappedRange();

        new Float32Array(uniformbuffer, 0, 4).set([
            this.size[0],
            this.size[1],
            this.size[0] / this.gpu.clustersInRow[0],
            this.size[1] / this.gpu.clustersInRow[1]]);
        this.#sizeBuffer.unmap();
        return this.#sizeBuffer;
    }
    getVariant(renderPipeline:Readonly<RenderPipeline>) {
        let variant = this.renderPipelines.get(renderPipeline)
        if (!variant) {
            const renderpipeline = this.decoratePipeline(renderPipeline);
            variant = {
                renderpipeline: renderpipeline,
                drawables: new Map(),
                rootDrawables: new Set()
            }
            this.renderPipelines.set(renderPipeline, variant)
        }
        return variant;
    }

    onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>):GPURenderPipelineDescriptor {
        const renderPipelineDescriptor:GPURenderPipelineDescriptor = {
            vertex: {
                ...renderpipeline.vertexShader,
                entryPoint: this.entryPoint,
            },
            fragment: {
                ...renderpipeline.fragmentShader,
                entryPoint: this.entryPoint,
                targets: Object.values(this.renderTargets).map(rt => {
                    return {
                        format: rt.texture.format,
                        writeMask:rt.writeMask
                    }
                })
            }
        }
        if (this.sampleCount > 1)
            renderPipelineDescriptor.multisample = { count: this.sampleCount };
        return renderPipelineDescriptor;
    }
    decoratePipeline(
        renderpipeline: Readonly<RenderPipeline>): GPURenderPipeline {
        return this.gpu.device.createRenderPipeline(
            {
                ...renderpipeline.renderPipelineDescriptor,
                ...this.onDecoratePipeline(renderpipeline),
                label: 'renderPipeline:'+renderpipeline.label+' RenderPass:'+this.label
                
            }
        )
    }
    onResize:Set<()=>void>=new Set();
    resize(width: number, height: number) {
        [this.size[0], this.size[1]] = this._onResize(width, height);
        this.updateSizeBindGroup();
        for (const rt of Object.values(this.renderTargets)) {
            rt.resize(this);
        }
        this.onResize.forEach(cb => cb());
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const colorAttachments = Object.values(this.renderTargets).map(rt => {
            return rt.createColorAttachment()
        });

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments,
        }
        return renderPassDescriptor;
    }
    get GPURenderBundleEncoderDescriptor(): GPURenderBundleEncoderDescriptor {
        return {
            colorFormats: Object.values(this.renderTargets).map(rt => rt.texture.format),
            sampleCount: this.sampleCount,
            label: this.label
        }
    }
    renderCamera(renderBundleEncoder: GPURenderBundleEncoder, rootLayout: PipelineLayout, rootBindGroup: GPUBindGroup, bindGroupStartIndex:number) {
        let drawedMeshes = 0;
        const dynamicIndices: number[] = [];
        renderBundleEncoder.setBindGroup(bindGroupStartIndex, rootBindGroup);
        rootLayout.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, bindGroupStartIndex+1);
        });
        //POSITION
        if (this.gpu.positionBindGroupTimeWGSL.bindGroupLayout.dynamicIndices) {
            dynamicIndices.push(bindGroupStartIndex+1);
        }
        this.gpu.positionBindGroupTimeWGSL.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, bindGroupStartIndex+1, dynamicIndices);
        });
        this.gpu.positionBindGroupTimeWGSL.subBindGroups.forEach(pipelineLayout => {
            if (pipelineLayout.sharedBindgroup) {
                renderBundleEncoder.setBindGroup(bindGroupStartIndex+2, pipelineLayout.sharedBindgroup);
            }
            pipelineLayout.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, bindGroupStartIndex + 1 + dynamicIndices.length, dynamicIndices);
            });
        });
        dynamicIndices.length = 0;
                    //SUN
        if (this.gpu.positionBindGroupTime.bindGroupLayout.dynamicIndices) {
            dynamicIndices.push(bindGroupStartIndex+1);
        }
        this.gpu.positionBindGroupTime.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, bindGroupStartIndex + 1, dynamicIndices);
        });
        this.gpu.positionBindGroupTime.subBindGroups.forEach(bindGroup => {
            bindGroup.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, bindGroupStartIndex + 1 + dynamicIndices.length, dynamicIndices);
            });
        });
        return drawedMeshes;
    }
    render(renderEncoder: GPUCommandEncoder) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        if (!this.bundles.length) {
            const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder(this.GPURenderBundleEncoderDescriptor);
            let drawedMeshes = 0;
            if(this.BindGroupCanvas) {
                drawedMeshes+= this.renderCamera(renderBundleEncoder,this.rootLayout,this.BindGroupCanvas(), 0)
            } else {
                renderBundleEncoder.setBindGroup(0, this.sizeBindGroup());

                this.cameras.forEach(camera => {
                    drawedMeshes+= this.renderCamera(renderBundleEncoder,this.rootLayout,camera.uniformBindGroup(),1)
                })
            }
            console.log('Meshes draw for',this.GPURenderBundleEncoderDescriptor.label,drawedMeshes)
            this.bundles.push(renderBundleEncoder.finish());
        }
        passEncoder.executeBundles(this.bundles);
        passEncoder.end();
    }
}

export class DepthRenderPass<T extends {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
} = {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
}
> extends RenderPass<T> {
    depthTexture: Texture<GPUTextureFormat, ['RENDER_ATTACHMENT', 'COPY_SRC', 'TEXTURE_BINDING']>;
    depthTextureView: TextureView;
    #depthFormat: GPUTextureFormat = 'depth32float';
    constructor(gpu: GPU,
        renderTargets: T,
        sampleCount: 1|4,
        size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        _onResize: (width: number, height: number) => [number, number],
        entryPoint: string,
        rootLayout: PipelineLayout,
        label:string) {
            super(gpu,renderTargets,sampleCount,size,_onResize,entryPoint,rootLayout, label);
            this.depthTexture = new Texture(gpu,this.#depthFormat,['RENDER_ATTACHMENT', 'COPY_SRC', 'TEXTURE_BINDING'],this.size)
            this.depthTextureView = new TextureView(this.depthTexture);
        }
        override resize(width: number, height: number) {
            super.resize(width, height);
            this.depthTexture.size[0]=this.size[0];
            this.depthTexture.size[1]=this.size[1];
            this.depthTexture.createTexture(this.sampleCount);
        }
        override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
            const renderPassDescriptor = super.GPURenderPassDescriptor;
            renderPassDescriptor.depthStencilAttachment = {
                view: this.depthTextureView.view,
                depthClearValue: 0.0,
                depthLoadOp: 'clear',
                depthStoreOp: "store",
                stencilClearValue: 0.0,
                stencilLoadOp: 'clear',
                stencilStoreOp: "store",
            }
            return renderPassDescriptor;
        }
        override get GPURenderBundleEncoderDescriptor(): GPURenderBundleEncoderDescriptor {
            return {
                colorFormats: Object.values(this.renderTargets).map(rt => rt.texture.format),
                sampleCount: this.sampleCount,
                label: this.label,
                depthStencilFormat: this.#depthFormat
            }
        }
        override onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>) {
            return {
                ...super.onDecoratePipeline(renderpipeline),
                depthStencil: {
                    depthWriteEnabled:renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
                    depthCompare:renderpipeline.depthBuffer?.depthCompare ?? 'greater',
                    format: this.#depthFormat   
                }
            }
        }
}

export class PickableRenderPass<T extends {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
} = {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
}> extends DepthRenderPass<T> {
    #pickBuffer: GPUBuffer;
    #pickBufferRead?: GPUBuffer;
    #pickPositionPipeline=this.gpu.createComputePipeline('readDepth.comp.wgsl');
    pickPositionLayout = this.#pickPositionPipeline.getBindGroupLayout(1)
    pickPositionBindGroup0: GPUBindGroup;
    rowBytes = this.size[0]*4;

    constructor(gpu: GPU,
        renderTargets: T,
        sampleCount: 1|4,
        size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        _onResize: (width: number, height: number) => [number, number],
        entryPoint: string,
        rootLayout: PipelineLayout,
        label: string) {
            super(gpu,renderTargets,sampleCount,size,_onResize,entryPoint,rootLayout,label);
            if(sampleCount == 4) {
                this.#pickBuffer = this.gpu.device.createBuffer({
                    size: 4 * 4, //depth + meshID (four pixel)
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
                    label: 'pickBuffer'
                });
                this.#pickBufferRead = this.gpu.device.createBuffer({
                    size: 4 + 4, //depth + meshID (four pixel)
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: 'pickBufferRead'
                });

            } else {
                const offset=this.rowBytes%256;
                if(offset!==0)
                    this.rowBytes=this.rowBytes-offset+256
                this.#pickBuffer = this.gpu.device.createBuffer({
                    size: this.rowBytes * this.size[1],
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: 'pickBuffer'
                }); 
            }
            this.pickPositionBindGroup0 = this.#pickPositionPipeline.createBindGroup(0,[
                {
                    binding: 0,
                    resource: {
                        buffer: this.#pickBuffer
                    }
                }]);
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        if(this.sampleCount === 1) {
            //update picking
            const oldpickBuffer=this.#pickBuffer;
            if(oldpickBuffer) {
                setTimeout(() => {
                    oldpickBuffer.destroy();
                },1000);
            }
            this.rowBytes=this.size[0]*4;
            const offset=this.rowBytes%256;
            if(offset!==0)
                this.rowBytes=this.rowBytes-offset+256

            this.#pickBuffer = this.gpu.device.createBuffer({
                size: this.rowBytes * this.size[1],
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: 'pickBuffer'
            });
        }
        this.onResize.forEach(cb => cb());
    }

    pickPromise: Promise<{ position: TerraVector3 } | null> | null = null;
    pickPromiseMesh: Promise<{ position: TerraVector3, meshId: number } | null> | null = null;


    pickPosition(): Promise<{ position: TerraVector3 } | null>
    pickPosition(mesh:true): Promise<{ position: TerraVector3, meshId: number } | null>
    pickPosition(mesh=false): Promise<{ position: TerraVector3 } | null> | Promise<{ position: TerraVector3, meshId: number } | null> {
        if (mesh && this.pickPromiseMesh) {
            return this.pickPromiseMesh
        }
        else if (!mesh && this.pickPromise) {
            return this.pickPromise
        }
        const camera = [...this.cameras][0]!;
        const encoder = this.gpu.device.createCommandEncoder();
        let zAndIDPromise:Promise<[z:number, id:number]>;
        const gRenderTargetDiffuse = this.renderTargets.gRenderTargetDiffuse
        if(gRenderTargetDiffuse instanceof MSAARenderTarget) {
            const mousePositionBuffer = engine.gpu.createGPUBuffer(8,[GPUBufferUsage.UNIFORM],true);
            new Uint32Array(mousePositionBuffer.getMappedRange(0,8)).set([engine.mousePosition[0], engine.mousePosition[1]]);
            mousePositionBuffer.unmap();
            const pickPositionBindGroup1 = engine.gpu.device.createBindGroup({
                layout: this.pickPositionLayout,
                entries: [
                    {
                        binding: 0,
                        resource: this.depthTextureView.view,
                    },
                    {
                        binding: 1,
                        resource: this.gpu.pickRenderPass.renderTargets.gRenderTargetId.view.view
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: mousePositionBuffer
                        }
                    }]
            });
            const pickPass = encoder.beginComputePass();
            pickPass.setPipeline(this.#pickPositionPipeline);
            pickPass.setBindGroup(0, this.pickPositionBindGroup0);
            pickPass.setBindGroup(1, pickPositionBindGroup1);
            pickPass.dispatch(1);
            pickPass.end();
            encoder.copyBufferToBuffer(this.#pickBuffer,0,this.#pickBufferRead!,0,4+4);
            this.gpu.device.queue.submit([encoder.finish()]);

            zAndIDPromise = this.#pickBufferRead!.mapAsync(GPUMapMode.READ,0,4+4).then(() => {
                const b = this.#pickBufferRead!.getMappedRange(0,4+4);
                const z = new DataView(b).getFloat32(0, true);
                const meshID = new DataView(b).getUint32(4, true);
                this.#pickBufferRead!.unmap();
                return [z, meshID];
            });
        }
        else {
            let newOffset=engine.mousePosition[1] * this.rowBytes + engine.mousePosition[0] * 4;
            //For MapAsync
            const missOffset = newOffset % 8; 
            if(missOffset!==0) {
                newOffset=newOffset-missOffset
            }
            //The entire subresource must be copied when the format (TextureFormat::Depth32Float) is a depth/stencil format or the sample count (1) is > 1.
            encoder.copyTextureToBuffer(
                {
                    texture: this.depthTexture.texture,
                    aspect: "depth-only",
                    origin: { x: 0, y: 0, z: 0 }
                },
                {
                    buffer: this.#pickBuffer,
                    bytesPerRow: this.rowBytes,
                    offset: 0
                },
                [this.size[0], this.size[1]]
            );
            if(mesh) {
                encoder.copyTextureToBuffer(
                    {
                        texture: this.gpu.pickRenderPass.renderTargets.gRenderTargetId.texture.texture,
                        origin: { x: engine.mousePosition[0], y: engine.mousePosition[1], z: 0 }
                    },
                    {
                        buffer: this.#pickBuffer,
                        bytesPerRow: 256,
                        offset: newOffset + missOffset + 32
                    },
                    [1, 1, 1]
                );
            }
            this.gpu.device.queue.submit([encoder.finish()]);
            const buffer=this.#pickBuffer;
            zAndIDPromise = this.#pickBuffer.mapAsync(GPUMapMode.READ,newOffset,missOffset+32 + 16).then(() => {
                const b = buffer.getMappedRange(newOffset,missOffset+32 + 16);
                const z = new DataView(b).getFloat32(missOffset, true);
                let meshId =0;
                if(mesh) {
                    this.pickPromiseMesh = null;
                    meshId = new DataView(b).getUint32(missOffset+32, true);
                } else
                    this.pickPromise = null;
                buffer.unmap();
                return [z, meshId];
            });
        }
        const promise=zAndIDPromise.then(zAndID => {

            if(zAndID[0] === 0) { // Z is 0 when did not hit anything, far plane value
                this.pickPromise = null;
                this.pickPromiseMesh = null;
                return null;
            }
            const result = new TerraVector3();
            const x = engine.mousePosition[0] / this.size[0] * 2 - 1;
            const y = -(engine.mousePosition[1] / this.size[1] * 2 - 1);
            new TerraVector3([x, y, zAndID[0]]).multiply2Ref(camera.projectionViewInverted, result);
            if(mesh) {
                this.pickPromiseMesh = null;
                return { position: result, meshId: zAndID[1] };
            } else
                this.pickPromise = null;
            return { position: result };
        });
        //Calculate inverted matrix while buffer is mapping
        if (camera.projectionViewInvertedIsDirty) {
            camera.projectionViewArr.invertToRef(camera.projectionViewInverted);
            camera.projectionViewInvertedIsDirty = false;
        }
        if(mesh) {
            this.pickPromiseMesh=promise as Promise<{
                position: TerraVector3;
                meshId: number;
            }>;
            return this.pickPromiseMesh;
        }
        else {
            this.pickPromise=promise;
            return this.pickPromise;
        }
    }
    async pickMesh(wantedMeshIds?: Set<number>, predicate?: (mesh: MainNode) => boolean): Promise<{ position: TerraVector3, mesh: MainNode } | null> {
        const pickInfo = await this.pickPosition(true);
        if (!pickInfo || (wantedMeshIds && !wantedMeshIds.has(pickInfo.meshId))) {
            return null;
        }
        else {
            const mesh = MainNode.Meshes.get(pickInfo.meshId);
            if (!mesh) {
                throw (new Error('Mesh, '+pickInfo.meshId+' not found'));
            }
            if (predicate && !predicate(mesh)) {
                return null;
            } else {
                return { position: pickInfo.position, mesh };
            }
        }
    }
}