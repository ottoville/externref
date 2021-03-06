import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";

export class RenderPass {
    cameras: Set<TerraCamera> = new Set();
    decoratePipeline(partialRenderPipelineDescriptor: Omit<GPURenderPipelineDescriptor,'colorStates'>): GPURenderPipelineDescriptor {
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
        })
        return renderPipelineDescriptor;
    }
    swapChain: GPUSwapChain | undefined;
    size = {
        width: this.width,
        height: this.height
    };
    private createTexture(format: GPUTextureFormat) {
        return this.gpu.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
        });
    };
    scenes: Set<Scene> = new Set();
    depthTextureView: GPUTextureView | undefined
    #depthTexture: GPUTexture | undefined
    targetTexture = this.createTexture("bgra8unorm");
    targetTextureView = this.targetTexture.createView();

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
    constructor(
        private gpu: GPU,
        private sampleCount: number = 1,
        depthStencil = false,
        public width: number,
        public height: number,
        private loadValue: GPULoadOp | GPUColor,
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {
        if (depthStencil) {
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
    }

    bundles: GPURenderBundle[] = [];
    colorFormats: GPUTextureFormat[] = ['bgra8unorm'];
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
    toBitmap() {
        //Use for debugging purpose. Targettexture must have copy source flag
        const encoder = this.gpu.device.createCommandEncoder();
        const buffer = this.gpu.device.createBuffer({
            size: this.size.height * this.size.width * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        })
        encoder.copyTextureToBuffer({
            texture: this.targetTexture
        }, { buffer: buffer, bytesPerRow: this.size.width * 4 },
            [this.size.width, this.size.height, 1]);
        this.gpu.device.queue.submit([encoder.finish()]);
        buffer.mapAsync(GPUMapMode.READ).then(() => {
            let c = new OffscreenCanvas(this.size.width, this.size.height);
            let ctx = c.getContext('2d');
            let imageData = ctx!.createImageData(c.width, c.height);
            imageData.data.set(new Uint8ClampedArray(buffer.getMappedRange()));
            buffer.unmap();
            ctx!.putImageData(imageData, 0, 0);
            c.convertToBlob({
                type: "image/jpeg",
                quality: 0.95
            }).then(b => {
                console.log(URL.createObjectURL(b));
            })

        })
    }
    #renderTargets: RenderTarget[] = []
    addRenderTarget(rt: RenderTarget) {
        this.colorFormats.push(rt.format);
        this.#renderTargets.push(rt);
    }
}
class RenderTarget {
    view: GPUTextureView;
    createTexture(size: GPUExtent3DStrict, sampleCount: number) {
        const texture = this.device.createTexture({
            size,
            sampleCount,
            format: this.format,
            usage: this.usage,
        });
        this.view = texture.createView();
        return this.view;
    }
    constructor(public device: GPUDevice,
        public format: GPUTextureFormat, public usage: GPUTextureUsageFlags, size: GPUExtent3DStrict, sampleCount: number) {
        this.view = this.createTexture(size, sampleCount)
    }
}
export class RenderPassCanvas extends RenderPass {
    constructor(
        gpu: GPU,
        sampleCount: number = 1,
        depthStencil = false,
        width: number,
        height: number,
        loadValue: GPULoadOp | GPUColor,
        _onResize: (width: number, height: number) => [number, number],
        usage: number = 0,
        public canvas: HTMLCanvasElement) {
        super(gpu, sampleCount, depthStencil, width, height, loadValue, _onResize, usage);
        this.addRenderTarget(new RenderTarget(gpu.device, "rgba32float",
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED, { width, height }, sampleCount));
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