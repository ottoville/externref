import type { Scene } from "../../Scene.js";
import type { TerraCamera } from "../../TerraCamera.js";
import { GPUBufferUsage, type GPU } from "../../GPU.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { Drawable } from "../Drawable.js";
import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import type { PipelineLayout } from "../PipelineLayout.js";
import type { GPUTextureUsageLiterals } from "../Texture.js";
import { type BindUniformBuffer, Buffer } from "../Buffer.js";
import type { BindGroup } from "../BindGroup.js";
import { RenderBundleEncoder } from "../RenderBundleEncoder.js";


interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}

type RenderTargetConstructor = (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, GPUTextureUsageLiterals[]>;

export class RenderPass<

U extends {
    [index: string]: RenderTargetConstructor } 
        = { [index: string]: RenderTargetConstructor },
> {
    /* Either cameras or bindGroupCanvas*/
    readonly cameras: Set<TerraCamera> = new Set();
    BindGroupCanvas?: () => BindGroup;

    readonly scenes: Set<Scene> = new Set();
    readonly bundles: RenderBundleEncoder[] = [];
    readonly renderPipelines: Map<Readonly<RenderPipeline>, RenderPipelineVariant2> = new Map();
    readonly sizeBindGroup: () => BindGroup;
    #sizeBuffer: BindUniformBuffer;
    readonly colorRenderTargets = {} as {
        [Property in keyof U]: ReturnType<U[Property]>
      };
    //Because typescript cannot extract returntype inside this function, use this private property for inside.
    readonly #colorRenderTargets = {} as {
        [Property in keyof U]: ReturnType<RenderTargetConstructor>
      };
    GPURenderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor;
    constructor(
        public gpu: GPU,
        colorRenderTargetsConstructors: U,
        public sampleCount: 1 | 4,
        public size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate],
        private _onResize: (width: number, height: number) => [number, number],
        
        private entryPoint: string,
        public rootLayout: PipelineLayout,
        protected label: string
    ) {
        Object.entries(colorRenderTargetsConstructors).forEach(([key, value]) => {
            const rt = value(this);
            //@ts-expect-error
            this.colorRenderTargets[key] = rt
            //@ts-expect-error
            this.#colorRenderTargets[key] = rt
            rt.resize(this.size[0], this.size[1], this.sampleCount)
        })
        this.GPURenderBundleEncoderDescriptor = {
            colorFormats: Object.values(this.#colorRenderTargets).map(rt => rt.texture.format),
            sampleCount: this.sampleCount,
            label: this.label
        }
        this.bundles.push(this.#renderBundle);
        this.#sizeBuffer = this.#updateSizeBindGroup(true);
        this.sizeBindGroup = () => gpu.sizeBindGroupLayout.createBindGroup('sizeBindGroup', bindGroup => [{
            binding: 0,
            resource: this.#sizeBuffer.getUniformBinding(bindGroup, 0, 16)
        }]);
    }
    #updateSizeBindGroup(initial = false) {
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
    getVariant(renderPipeline: Readonly<RenderPipeline>) {
        let variant = this.renderPipelines.get(renderPipeline)
        if (!variant) {
            const renderpipeline = this.#decoratePipeline(renderPipeline);
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
                targets: Object.values(this.#colorRenderTargets).map(rt => {
                    return {
                        format: rt.texture.format,
                        writeMask: rt.writeMask
                    }
                })
            }
        }
        if (this.sampleCount > 1)
            renderPipelineDescriptor.multisample = { count: this.sampleCount };
        return renderPipelineDescriptor;
    }
    #decoratePipeline(
        renderpipeline: Readonly<RenderPipeline>): GPURenderPipeline {
        return this.gpu.device.createRenderPipeline(
            {
                ...renderpipeline.renderPipelineDescriptor,
                layout: renderpipeline.bindgroupdrawable.layout,
                ...this.onDecoratePipeline(renderpipeline),
                label: 'renderPipeline:' + renderpipeline.label + ' RenderPass:' + this.label

            }
        )
    }
    resize(width: number, height: number) {
        [this.size[0], this.size[1]] = this._onResize(width, height);
        this.#updateSizeBindGroup();
        for (const rt of Object.values(this.#colorRenderTargets)) {
            rt.resize(this.size[0], this.size[1], this.sampleCount)
        }
    }
    //TODO: dont execute this function on every render
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: Object.values(this.#colorRenderTargets).map(rt => 
                rt.createColorAttachment()
            ),
        };
        return renderPassDescriptor;
    }

    #renderCamera(GPUrenderBundleEncoder: GPURenderBundleEncoder, renderBundleEncoder: RenderBundleEncoder, rootLayout: PipelineLayout, rootBindGroup: BindGroup, bindGroupStartIndex: number) {
        let drawedMeshes = 0;
        const dynamicIndices: number[] = [];
        GPUrenderBundleEncoder.setBindGroup(bindGroupStartIndex, rootBindGroup.getForRenderPass(renderBundleEncoder));
        rootLayout.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + 1);
        });
        //POSITION
        if (this.gpu.positionBindGroupTimeWGSL.bindGroupLayout.dynamicIndices) {
            dynamicIndices.push(bindGroupStartIndex + 1);
        }
        this.gpu.positionBindGroupTimeWGSL.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + 1, dynamicIndices);
        });
        this.gpu.positionBindGroupTimeWGSL.subBindGroups.forEach(pipelineLayout => {
            if (pipelineLayout.sharedBindgroup) {
                GPUrenderBundleEncoder.setBindGroup(bindGroupStartIndex + 2, pipelineLayout.sharedBindgroup.getForRenderPass(renderBundleEncoder));
            }
            pipelineLayout.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + 1 + dynamicIndices.length, dynamicIndices);
            });
        });
        dynamicIndices.length = 0;
        //SUN
        if (this.gpu.positionBindGroupTime.bindGroupLayout.dynamicIndices) {
            dynamicIndices.push(bindGroupStartIndex + 1);
        }
        this.gpu.positionBindGroupTime.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + 1, dynamicIndices);
        });
        this.gpu.positionBindGroupTime.subBindGroups.forEach(bindGroup => {
            bindGroup.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + 1 + dynamicIndices.length, dynamicIndices);
            });
        });
        return drawedMeshes;
    }
    readonly #renderBundle:RenderBundleEncoder = new RenderBundleEncoder(this, (GPUrenderBundleEncoder, renderBundleEncoder) => {
        //@ts-ignore
        let drawedMeshes = 0;
        if (this.BindGroupCanvas) {
            drawedMeshes += this.#renderCamera(GPUrenderBundleEncoder,renderBundleEncoder, this.rootLayout, this.BindGroupCanvas(), 0)
        } else {
            GPUrenderBundleEncoder.setBindGroup(0, this.sizeBindGroup().getForRenderPass(renderBundleEncoder));
            this.cameras.forEach(camera => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                drawedMeshes += this.#renderCamera(GPUrenderBundleEncoder,renderBundleEncoder, this.rootLayout, camera.uniformBindGroup!, 1)
            })
        }
        //console.log('Meshes draw for',this.GPURenderBundleEncoderDescriptor.label,drawedMeshes)
    })

    render(renderEncoder: GPUCommandEncoder) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        passEncoder.executeBundles(this.bundles.map(b => {
            return b.renderBundle(this.GPURenderBundleEncoderDescriptor)
        }));
        passEncoder.end();
    }
}