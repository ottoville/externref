import type { TerraCamera } from "../../TerraCamera.js";
import { type GPU } from "../../GPU.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { Drawable } from "../Drawables/Drawable.js";
import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import type { PipelineLayout } from "../PipelineLayout.js";
import { type BindUniformBuffer, Buffer, GPUBufferUsage } from "../Buffer.js";
import type { BindGroup } from "../BindGroup.js";
import { RenderBundleEncoder } from "../RenderBundleEncoder.js";
import type { DrawableNode } from "../../MainNode.js";
import { RenderTargetTextureUsageValue } from "../RenderTargets/RenderTarget.js";


interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    rootDrawables: Set<Drawable>
}

type RenderTargetConstructor = (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;

export type RenderPassProps<U> = {
    gpu: GPU;
    colorRenderTargetsConstructors: U;
    sampleCount: 1 | 4;
    size: {width: number, height: number};
    getSizeOnResize: (width: number, height: number) => [number, number];
    entryPoint: string;
    rootLayout: PipelineLayout;
    label: string;
}

export class RenderPass<U extends {
    [index: string]: RenderTargetConstructor } 
        = { [index: string]: RenderTargetConstructor },
> {

    readonly perspectiveCameras: Set<TerraCamera> = new Set();

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
    onResize:Map<DrawableNode, () => void>=new Map();
    public gpu: GPU
    protected sampleCount: 1 | 4;
    public size: { width: number, height: number};
    #entryPoint: string
    #getSizeOnResize: (width: number, height: number) => [number, number];
    #rootLayout: PipelineLayout
    protected label: string
    constructor(
        {
            gpu,
            colorRenderTargetsConstructors,
            sampleCount,
            size,
            getSizeOnResize,
            entryPoint,
            rootLayout,
            label
        } : RenderPassProps<U>
    ) {
        this.gpu = gpu;
        this.sampleCount = sampleCount;
        this.size = size;
        this.#getSizeOnResize = getSizeOnResize;
        this.#entryPoint = entryPoint;
        this.#rootLayout = rootLayout;
        this.label = label;
        Object.entries(colorRenderTargetsConstructors).forEach(([key, value]) => {
            const rt = value(this);
            //@ts-expect-error
            this.colorRenderTargets[key] = rt
            //@ts-expect-error
            this.#colorRenderTargets[key] = rt
            rt.resize(this.size, this.sampleCount)
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
                this.size.width,
                this.size.height,
                this.size.width / this.gpu.clustersInRow[0],
                this.size.height / this.gpu.clustersInRow[1]]);
        });

        return this.#sizeBuffer;
    }
    getVariant(renderPipeline: Readonly<RenderPipeline>) {
        let variant = this.renderPipelines.get(renderPipeline)
        if (!variant) {
            const renderpipeline = this.#decoratePipeline(renderPipeline);
            variant = {
                renderpipeline: renderpipeline,
                rootDrawables: new Set()
            }
            this.renderPipelines.set(renderPipeline, variant)
        }
        return variant;
    }

    protected onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>): Omit<GPURenderPipelineDescriptor, 'layout'> {
        const renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'layout'> = {
            vertex: {
                ...renderpipeline.vertexShader,
                entryPoint: this.#entryPoint,
            },
            fragment: {
                ...renderpipeline.fragmentShader,
                entryPoint: this.#entryPoint,
                targets: Object.values(this.#colorRenderTargets).map(rt => {
                    const state:GPUColorTargetState = {
                        format: rt.texture.format,
                        writeMask: rt.renderTargetOptions.writeMask,
                    }
                    if(rt.blend) {
                        state.blend=rt.blend
                    }
                    return state;
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
        [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
        this.#updateSizeBindGroup();
        for (const rt of Object.values(this.#colorRenderTargets)) {
            rt.resize(this.size, this.sampleCount)
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

    #renderCamera(GPUrenderBundleEncoder: GPURenderBundleEncoder, renderBundleEncoder: RenderBundleEncoder, rootLayout: PipelineLayout, bindGroupStartIndex: number) {
        let drawedMeshes = 0;
        rootLayout.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex);
        });
        const dynamicIndices: number[] = [];
        rootLayout.subBindGroups.forEach(subBindGroup => {
            //POSITION
            if (subBindGroup.bindGroupLayout.dynamicIndices) {
                dynamicIndices.push(bindGroupStartIndex);
            }
            subBindGroup.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex, dynamicIndices);
            });
            subBindGroup.subBindGroups.forEach(pipelineLayout => {
                if (pipelineLayout.sharedBindgroup) {
                    GPUrenderBundleEncoder.setBindGroup(bindGroupStartIndex + 1, pipelineLayout.sharedBindgroup.getForRenderPass(renderBundleEncoder));
                }
                pipelineLayout.renderPipeLines.forEach(renderPipeline => {
                    drawedMeshes += renderPipeline.draw(GPUrenderBundleEncoder, this, bindGroupStartIndex + dynamicIndices.length, dynamicIndices);
                });
            });
            dynamicIndices.length = 0;
        });
        return drawedMeshes;
    }
    readonly #renderBundle:RenderBundleEncoder = new RenderBundleEncoder(this, (GPUrenderBundleEncoder, renderBundleEncoder) => {
        //@ts-ignore
        let drawedMeshes = 0;
        if(this.perspectiveCameras.size === 0) {
            // Draw UI
            drawedMeshes += this.#renderCamera(GPUrenderBundleEncoder,renderBundleEncoder, this.#rootLayout, 0)
        } else {
            GPUrenderBundleEncoder.setBindGroup(0, this.sizeBindGroup().getForRenderPass(renderBundleEncoder));
            this.perspectiveCameras.forEach(camera => {
                GPUrenderBundleEncoder.setBindGroup(1, camera.uniformBindGroup!.bindGroup);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                drawedMeshes += this.#renderCamera(GPUrenderBundleEncoder,renderBundleEncoder, this.#rootLayout, 2)
            })
        }
    })

    render(renderEncoder: GPUCommandEncoder) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        passEncoder.executeBundles(this.bundles.map(b => {
            return b.renderBundle(this.GPURenderBundleEncoderDescriptor)
        }));
        passEncoder.end();
    }
}