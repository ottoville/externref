import type { Scene } from "../Scene";
import type { TerraCamera } from "../TerraCamera";
import type { GPU } from "../GPU";

export class RenderPass {
    cameras: Set<TerraCamera> = new Set();
    decoratePipeline(renderPipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipelineDescriptor {
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
        return renderPipelineDescriptor;
    }
    swapChain: GPUSwapChain | undefined;
    size = {
        width: this.width,
        height: this.height,
        depth: 1,
    };
    createTexture(format: GPUTextureFormat) {
        return this.gpu.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
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
    }
    #renderPassDescriptor: Partial<GPURenderPassDescriptor> = {
        colorAttachments: undefined,
        depthStencilAttachment: undefined
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        let colorAttachment: GPURenderPassColorAttachmentDescriptor;
        if (this.swapChain) {
            colorAttachment = this.sampleCount > 1 ? {
                attachment: this.targetTextureView,
                resolveTarget: this.swapChain.getCurrentTexture().createView(),
                loadValue: this.loadValue
            } : {
                    attachment: this.swapChain.getCurrentTexture().createView(),
                    loadValue: this.loadValue
                }
        } else {
            colorAttachment = {
                attachment: this.targetTextureView,
                loadValue: this.loadValue,
                storeOp: "store"
            }
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
        this.#renderPassDescriptor.colorAttachments = [colorAttachment];
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
    render(renderEncoder: GPUCommandEncoder, cameraBindGroup:GPUBindGroup) {
        try {
            const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
            if (!this.bundles.length) {
                console.log('record bundle');
                const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder({
                    colorFormats: ['bgra8unorm'],
                    sampleCount: this.sampleCount,
                    depthStencilFormat: this.#depthTexture?'depth24plus-stencil8':undefined
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
            drawedMeshes+=rp.draw(passEncoder, this, 1);
        });
        if (this.gpu.rootlayout.subBindGroups.size) {
           // console.log('this.gpu.rootlayout.subBindGroups.size', this.gpu.rootlayout.subBindGroups.size)
            this.gpu.rootlayout.subBindGroups.forEach(bgt =>
                drawedMeshes +=this.gpu.drawBindGroups(passEncoder, bgt, this, 1)
            )
        };
        
        this.scenes.forEach(scene =>
            drawedMeshes += scene.render(passEncoder, this)
        );
        console.log('scenes ', this.scenes.size, 'meshes', drawedMeshes);
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
        this.gpu.device.defaultQueue.submit([encoder.finish()]);
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
        const context: GPUCanvasContext = canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
        this.swapChain = context.configureSwapChain({
            device: gpu.device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT
        });
    }
    onResize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        super.onResize(width, height);
    }
}