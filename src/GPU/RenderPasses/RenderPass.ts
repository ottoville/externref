import type { Scene } from "../../Scene.js";
import type { TerraCamera } from "../../TerraCamera.js";
import { GPUBufferUsage, type GPU } from "../../GPU.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { Drawable } from "../Drawable.js";
import type { RenderTarget } from "../RenderTargets/RenderTarget.js";
import { PipelineLayout } from "../PipelineLayout.js";
import { GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { type BindUniformBuffer, Buffer } from "../Buffer.js";


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
    #sizeBuffer: BindUniformBuffer;
    
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
            resource: this.#sizeBuffer.getUniformBinding(0, 16)
        }]);
    }
    updateSizeBindGroup(initial = false) {
        if (!initial)
            this.#sizeBuffer.destroy();
        this.#sizeBuffer = Buffer.create(this.gpu, this.gpu.gpu_screen_buffer_size, [GPUBufferUsage.UNIFORM], 'screen_buffer', b => {
            const uniformbuffer = b.getMappedRange();
            new Float32Array(uniformbuffer, 0, 4).set([
                this.size[0],
                this.size[1],
                this.size[0] / this.gpu.clustersInRow[0],
                this.size[1] / this.gpu.clustersInRow[1]]);
        });

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

    onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>): Omit<GPURenderPipelineDescriptor, 'layout'> {
        const renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'layout'> = {
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
                layout: renderpipeline.bindgroupdrawable.layout,
                ...this.onDecoratePipeline(renderpipeline),
                label: 'renderPipeline:'+renderpipeline.label+' RenderPass:'+this.label
                
            }
        )
    }
    resize(width: number, height: number) {
        [this.size[0], this.size[1]] = this._onResize(width, height);
        this.updateSizeBindGroup();
        for (const rt of Object.values(this.renderTargets)) {
            rt.resize(this);
        }
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        return  {
            colorAttachments: Object.values(this.renderTargets).map(rt => rt.createColorAttachment()),
        };
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
            //@ts-ignore
            let drawedMeshes = 0;
            if(this.BindGroupCanvas) {
                drawedMeshes+= this.renderCamera(renderBundleEncoder,this.rootLayout,this.BindGroupCanvas(), 0)
            } else {
                renderBundleEncoder.setBindGroup(0, this.sizeBindGroup());

                this.cameras.forEach(camera => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    drawedMeshes+= this.renderCamera(renderBundleEncoder,this.rootLayout,camera.uniformBindGroup!(),1)
                })
            }
            //console.log('Meshes draw for',this.GPURenderBundleEncoderDescriptor.label,drawedMeshes)
            this.bundles.push(renderBundleEncoder.finish());
        }
        passEncoder.executeBundles(this.bundles);
        passEncoder.end();
    }
}