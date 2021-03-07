import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";
import { RenderPipeline } from "./RenderPipeline.js";
import { Drawable } from "./Drawable.js";

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass {
    cameras: Set<TerraCamera> = new Set();
    swapChain: GPUSwapChain | undefined;

    scenes: Set<Scene> = new Set();
    depthTextureView: GPUTextureView | undefined
    #depthTexture: GPUTexture | undefined
    targetTexture = this.createTexture("bgra8unorm");
    targetTextureView = this.targetTexture.createView();
    bundles: GPURenderBundle[] = [];
    colorFormats: GPUTextureFormat[] = ['bgra8unorm'];
    #renderTargets: RenderTarget[] = []
    renderPipelines: Map<RenderPipeline, RenderPipelineVariant2> = new Map();

    constructor(
        public gpu: GPU,
        public sampleCount: number = 1,
        depthStencil = false,
        public size: { width: number, height: number },
        private loadValue: GPULoadOp | GPUColor,
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {
        if (depthStencil) {
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
    }
    decoratePipeline(partialRenderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'colorStates'>): GPURenderPipeline {
        const renderPipelineDescriptor = partialRenderPipelineDescriptor as GPURenderPipelineDescriptor;
        if (!this.#depthTexture)
            renderPipelineDescriptor.depthStencilState = undefined
        else if (!renderPipelineDescriptor.depthStencilState) {
            renderPipelineDescriptor.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        renderPipelineDescriptor.sampleCount = this.sampleCount;
        renderPipelineDescriptor.colorStates = this.colorFormats.map(cf => {
            return {
                format: cf
            }
        });
        return this.gpu.device.createRenderPipeline(renderPipelineDescriptor)
        //return renderPipelineDescriptor;
    }

    private createTexture(format: GPUTextureFormat) {
        return this.gpu.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
        });
    };

    onResize(width: number, height: number) {
        this.bundles.length = 0;
        [this.size.width, this.size.height] = this._onResize(width, height);
        this.cameras.forEach(camera => camera.onResize(this.size.width, this.size.height));
        this.targetTexture.destroy();
        this.targetTexture = this.createTexture("bgra8unorm");
        this.targetTextureView = this.targetTexture.createView();
        if (this.#depthTexture) {
            this.#depthTexture.destroy();
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
        this.#renderTargets.forEach(renderTarget => renderTarget.createTexture(this.size, this.sampleCount));
    }
    #renderPassDescriptor: Partial<GPURenderPassDescriptor> = {
        colorAttachments: undefined,
        depthStencilAttachment: undefined
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const colorAttachments: GPURenderPassColorAttachmentDescriptor[] = []

        if (this.swapChain) {
            colorAttachments.push(this.sampleCount > 1 ? {
                attachment: this.targetTextureView,
                resolveTarget: this.swapChain.getCurrentTexture().createView(),
                loadValue: this.loadValue
            } : {
                attachment: this.swapChain.getCurrentTexture().createView(),
                loadValue: this.loadValue
            })
            colorAttachments.push(...this.#renderTargets.map(rt => {
                return {
                    attachment: rt.view,
                    loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: "store" as const,
                }
            }))
        } else {
            colorAttachments.push({
                attachment: this.targetTextureView,
                loadValue: this.loadValue,
                storeOp: "store"
            })
        }
        if (this.depthTextureView) {
            this.#renderPassDescriptor.depthStencilAttachment = {
                attachment: this.depthTextureView,
                depthLoadValue: 1,
                depthStoreOp: "store",
                stencilLoadValue: 0,
                stencilStoreOp: "store",
            }
        }
        this.#renderPassDescriptor.colorAttachments = colorAttachments;
        return this.#renderPassDescriptor as GPURenderPassDescriptor;
    }

    render(renderEncoder: GPUCommandEncoder, cameraBindGroup: GPUBindGroup) {
        try {
            const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
            if (!this.bundles.length) {
                const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder({
                    colorFormats: this.colorFormats,
                    sampleCount: this.sampleCount,
                    depthStencilFormat: this.#depthTexture ? 'depth24plus-stencil8' : undefined
                });
                this.recordRenderPass(renderBundleEncoder, cameraBindGroup);
                this.bundles.push(renderBundleEncoder.finish());
            }
            passEncoder.executeBundles(this.bundles);
            passEncoder.endPass();
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
    recordRenderPass(passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, cameraBindGroup: GPUBindGroup) {
        let drawedMeshes = 0;
        passEncoder.setBindGroup(0, cameraBindGroup);
        this.gpu.rootlayout.renderPipeLines.forEach(rp => {
            drawedMeshes += rp.draw(passEncoder, this, 1);
        });
        if (this.gpu.rootlayout.subBindGroups.size) {
            this.gpu.rootlayout.subBindGroups.forEach(bgt =>
                drawedMeshes += this.gpu.drawBindGroups(passEncoder, bgt, this, 1)
            )
        };

        this.scenes.forEach(scene =>
            drawedMeshes += scene.render(passEncoder, this)
        );
        // console.log('scenes ', this.scenes.size, 'meshes', drawedMeshes);
    }
    addRenderTarget(rt: RenderTarget) {
        this.colorFormats.push(rt.format);
        this.#renderTargets.push(rt);
    }
}
class RenderTarget {
    view: GPUTextureView;
    texture: GPUTexture;
    debug = false
    createTexture(size: { width: number, height: number }, sampleCount: number) {
        this.size = size;
        this.sampleCount = sampleCount;
        let usage = this.usage;
        if (this.debug)
            usage |= GPUTextureUsage.COPY_SRC;
        this.texture = this.renderPass.gpu.device.createTexture({
            size,
            sampleCount,
            format: this.format,
            usage: usage,
        });
        this.view = this.texture.createView();
        return [this.view, this.texture] as const;
    }
    constructor(public renderPass: RenderPass,
        public format: GPUTextureFormat, public usage: GPUTextureUsageFlags, public size: { width: number, height: number }, public sampleCount: number) {
        [this.view, this.texture] = this.createTexture(size, sampleCount)
    }
    toBitmap() {
        //Use for debugging purpose.
        this.debug = true;
        const oldSampleCount = this.renderPass.sampleCount;

        this.renderPass.sampleCount = 1
        this.renderPass.renderPipelines.forEach((rpVariant, rp) => rpVariant.renderpipeline = this.renderPass.decoratePipeline(rp.renderPipelineDescriptor))

        this.renderPass.bundles.length = 0;
        this.renderPass.onResize(this.renderPass.size.width, this.renderPass.size.height)

        setTimeout(() => {
            const encoder = this.renderPass.gpu.device.createCommandEncoder();
            const buffer = this.renderPass.gpu.device.createBuffer({
                size: this.size.height * this.size.width * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            })
            encoder.copyTextureToBuffer({
                texture: this.texture
            }, { buffer: buffer, bytesPerRow: this.size.width * 4 },
                [this.size.width, this.size.height, 1]);
            this.renderPass.gpu.device.queue.submit([encoder.finish()]);
            buffer.mapAsync(GPUMapMode.READ).then(() => {
                let c = new OffscreenCanvas(this.size.width, this.size.height);
                let ctx = c.getContext('2d');
                let imageData = ctx!.createImageData(c.width, c.height);
                const data = new Uint8ClampedArray(buffer.getMappedRange());
                imageData.data.set(data);
                buffer.unmap();
                ctx!.putImageData(imageData, 0, 0);
                c.convertToBlob({
                    type: "image/jpeg",
                    quality: 0.95
                }).then(b => {
                    console.log(URL.createObjectURL(b));
                })
            });
            setTimeout(() => {
                this.debug = false;
                this.renderPass.bundles.length = 0;
                this.renderPass.sampleCount = oldSampleCount;
                this.renderPass.renderPipelines.forEach((rpVariant, rp) => rpVariant.renderpipeline = this.renderPass.decoratePipeline(rp.renderPipelineDescriptor))
                this.renderPass.onResize(this.renderPass.size.width, this.renderPass.size.height)

                this.createTexture(this.size, this.sampleCount);
            }, 200)
        }, 200)
    }
}
export class RenderPassCanvas extends RenderPass {
    constructor(
        gpu: GPU,
        sampleCount: number = 1,
        depthStencil = false,
        size: { width: number, height: number },
        loadValue: GPULoadOp | GPUColor,
        _onResize: (width: number, height: number) => [number, number],
        usage: number = 0,
        public canvas: HTMLCanvasElement) {

        super(gpu, sampleCount, depthStencil, size, loadValue, _onResize, usage);
        const gRenderTarget = new RenderTarget(this, "bgra8unorm",
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED, size, sampleCount);
        this.addRenderTarget(gRenderTarget);
        //@ts-ignore
        window.printRenderTarget = () => {
            gRenderTarget.toBitmap()
        }

        const context: GPUCanvasContext = canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
        this.swapChain = context.configureSwapChain({
            device: gpu.device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    onResize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        super.onResize(width, height);
    }
}