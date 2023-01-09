import type { TerraCamera } from "../../TerraCamera.js";
import { type GPU } from "../../GPU.js";
import type { Drawable } from "../Drawables/Drawable.js";
import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import { type BindUniformBuffer, Buffer, GPUBufferUsage } from "../Buffer/Buffer.js";
import type { BindGroup } from "../BindGroup.js";
import { RenderBundleEncoder } from "../RenderBundleEncoder.js";
import type { RenderTargetTextureUsageValue } from "../Texture.js";
import { RenderPipelineLayout } from "../PipelineLayout.js";
import { RenderPipeline } from "../RenderPipeline.js";
import { RenderPipeline2 } from "../RenderPipeline2.js";
import { VertexShader } from "../Shaders/VertexShader.js";


interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    rootDrawables: Set<Drawable>
}

export type RenderPassProps<U> = {
    gpu: GPU;
    colorRenderTargets: U;
    sampleCount: 1 | 4;
    size: { width: number, height: number };
    getSizeOnResize: (width: number, height: number) => [number, number];
    entryPoint: string;
    rootLayout: RenderPipelineLayout;
    label: string;
    GPURenderBundleEncoderDescriptor?: Partial<GPURenderBundleEncoderDescriptor>
}

export class RenderPass<U extends {
    [index: string]: ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>
}
    = { [index: string]: ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue> },
> {

    readonly perspectiveCameras: Set<TerraCamera> = new Set();

    readonly bundles: RenderBundleEncoder[] = [];
    readonly renderPipelines: Map<Readonly<RenderPipeline | RenderPipeline2>, RenderPipelineVariant2 | Promise<RenderPipelineVariant2>> = new Map();
    readonly sizeBindGroup: () => BindGroup;
    #sizeBuffer: BindUniformBuffer;
    readonly colorRenderTargets = {} as U
    onResize: Map<object, () => void> = new Map();
    public gpu: GPU
    public sampleCount: 1 | 4;
    public size: { width: number, height: number };
    #entryPoint: string
    #getSizeOnResize: (width: number, height: number) => [number, number];
    #rootLayout: RenderPipelineLayout
    public label: string
    constructor(
        {
            gpu,
            colorRenderTargets,
            sampleCount,
            size,
            getSizeOnResize,
            entryPoint,
            rootLayout,
            label,
            GPURenderBundleEncoderDescriptor
        }: RenderPassProps<U>
    ) {
        this.gpu = gpu;
        this.sampleCount = sampleCount;
        this.size = size;
        this.#getSizeOnResize = getSizeOnResize;
        this.#entryPoint = entryPoint;
        this.#rootLayout = rootLayout;
        this.label = label;
        this.colorRenderTargets = colorRenderTargets;
        const renderTargersArray = Object.values(colorRenderTargets);
        renderTargersArray.forEach(rt => {
            rt.resize(this.size, this.sampleCount)
        });
        const renderBundle = new RenderBundleEncoder(this, GPURenderBundleEncoderDescriptor, (renderBundleEncoder) => {
            Object.values(this.colorRenderTargets).some(rt => {
                if (rt.texture.sampleCount === 0 && rt.view.bindGroups.size === 0) {
                    console.warn('Rendertarget ', rt.label, ' is not binded as texture, render result will be shown.')
                }
            })
            //@ts-ignore
            let drawedMeshes = 0;
            if (this.perspectiveCameras.size === 0) {
                // Draw UI
                drawedMeshes += this.#renderCamera(renderBundleEncoder, this.#rootLayout, 0)
            } else {
                renderBundleEncoder.renderBundleEncoder.setBindGroup(0, this.sizeBindGroup().getForRenderBundle(renderBundleEncoder));
                this.perspectiveCameras.forEach(camera => {
                    // TODO: camera.uniformBindGroup holds gpu.GPUMeshes on binding 3 which
                    // is not used in rendering shaders, but it is binded later with dynamic indices.
                    // Concider refactoring it out of this
                    renderBundleEncoder.renderBundleEncoder.setBindGroup(1, camera.uniformBindGroup!.getForRenderBundle(renderBundleEncoder));
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    drawedMeshes += this.#renderCamera(renderBundleEncoder, this.#rootLayout, 2)
                })
            }
        })
        this.bundles.push(renderBundle);
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
    getVariant(renderPipeline: Readonly<RenderPipeline | RenderPipeline2>) {
        let variant = this.renderPipelines.get(renderPipeline);
        if (!variant) {
            const variantP = this.gpu.device.createRenderPipelineAsync(
                {
                    ...renderPipeline.props.renderPipeline,
                    layout: renderPipeline.props.bindgroupdrawable.layout,
                    ...this.onDecoratePipeline(renderPipeline),
                    label: 'renderPipeline:' + renderPipeline.props.label + ' RenderPass:' + this.label
                }
            ).catch((err: unknown) => {
                console.error('createRenderPipelineAsync failed, wgsl:', (renderPipeline.props.vertexShader as VertexShader).wgsl, { cause: err })
                throw (new Error('createRenderPipelineAsync failed', { cause: err }));
            }).then((variantPipeline) => {
                variant = {
                    renderpipeline: variantPipeline,
                    rootDrawables: new Set<Drawable>()
                }
                // Replace promise with real object
                this.renderPipelines.set(renderPipeline, variant);
                return variant;
            })
            // Save promise
            this.renderPipelines.set(renderPipeline, variantP)
            variant = variantP;
        }
        return variant;
    }

    protected onDecoratePipeline(renderpipeline: Readonly<RenderPipeline | RenderPipeline2>): Omit<GPURenderPipelineDescriptor, 'layout'> {
        const renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'layout'> = {
            vertex: {
                ...renderpipeline.props.vertexShader,
                entryPoint: this.#entryPoint,
            },
            fragment: {
                ...renderpipeline.props.fragmentShader,
                entryPoint: this.#entryPoint,
                targets: Object.values(this.colorRenderTargets).map(rt => {
                    const state: GPUColorTargetState = {
                        format: rt.texture.format,
                        writeMask: rt.renderTargetOptions.writeMask,
                    }
                    if (rt.blend) {
                        state.blend = rt.blend
                    }
                    return state;
                })
            }
        }
        if (this.sampleCount > 1)
            renderPipelineDescriptor.multisample = { count: this.sampleCount };
        return renderPipelineDescriptor;
    }
    resize(width: number, height: number) {
        [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
        this.#updateSizeBindGroup();
        for (const rt of Object.values(this.colorRenderTargets)) {
            rt.resize(this.size, this.sampleCount)
        }
    }
    //TODO: dont execute this function on every render
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: Object.values(this.colorRenderTargets).map(rt =>
                rt.createColorAttachment()
            ),
        };
        return renderPassDescriptor;
    }

    #renderCamera(renderBundleEncoder: RenderBundleEncoder, rootLayout: RenderPipelineLayout, bindGroupStartIndex: number) {
        let drawedMeshes = 0;
        rootLayout.renderPipeLines.forEach(renderPipeline => {
            drawedMeshes += renderPipeline.draw(renderBundleEncoder.renderBundleEncoder, this, bindGroupStartIndex);
        });
        const dynamicIndices: number[] = [];
        rootLayout.subBindGroups.forEach(subBindGroup => {
            //POSITION
            if (subBindGroup.bindGroupLayout.dynamicIndices) {
                dynamicIndices.push(bindGroupStartIndex);
            }
            subBindGroup.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder.renderBundleEncoder, this, bindGroupStartIndex, dynamicIndices);
            });
            subBindGroup.subBindGroups.forEach(pipelineLayout => {
                if (pipelineLayout.sharedBindgroup) {
                    renderBundleEncoder.renderBundleEncoder.setBindGroup(bindGroupStartIndex + 1, pipelineLayout.sharedBindgroup.getForRenderBundle(renderBundleEncoder));
                }
                pipelineLayout.renderPipeLines.forEach(renderPipeline => {
                    drawedMeshes += renderPipeline.draw(renderBundleEncoder.renderBundleEncoder, this, bindGroupStartIndex + dynamicIndices.length, dynamicIndices);
                });
            });
            dynamicIndices.length = 0;
        });
        return drawedMeshes;
    }

    render(renderEncoder: GPUCommandEncoder) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        passEncoder.executeBundles(this.bundles.map(b => {
            return b.renderBundle()
        }));
        passEncoder.end();
    }
}