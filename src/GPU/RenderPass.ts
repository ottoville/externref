import { TerraCamera } from "../TerraCamera";
import { TerraScene } from "../TerraScene";

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
        return this.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
        });
    }
    depthTextureView: GPUTextureView | undefined
    #depthTexture: GPUTexture | undefined
    targetTexture = this.createTexture("bgra8unorm");
    targetTextureView = this.targetTexture.createView();

    onResize(width: number, height: number) {
        [this.size.width, this.size.height]=this._onResize(width, height);
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
        private device: GPUDevice,
        private sampleCount: number = 1,
        depthStencil = false,
        private width: number,
        private height: number,
        private loadValue: GPULoadOp | GPUColor,
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {



        if (depthStencil) {
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
    }
    render(renderEncoder: GPUCommandEncoder, time: DOMHighResTimeStamp) {
        try {
            let physicDelta: number | null;
            if (TerraScene.instance.physics.gameSpeed == -1)
                physicDelta = null;
            else
                physicDelta = (TerraScene.instance.physics.physicTime - TerraScene.instance.physics.gameTime) / ((TerraScene.instance.tickIntervalMs / 1000) << TerraScene.instance.physics.gameSpeed)

            const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
            TerraScene.instance.gpuscene.render(passEncoder, this, time, physicDelta);
            passEncoder.endPass();
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
}

export class RenderPassCanvas extends RenderPass {
    constructor(device: GPUDevice, sampleCount: number = 1, depthStencil = false, width: number, height: number, loadValue: GPULoadOp | GPUColor, _onResize: (width: number, height: number) => [number, number], usage: number = 0, public canvas: HTMLCanvasElement) {
        super(device, sampleCount, depthStencil, width, height, loadValue, _onResize, usage);
        const context: GPUCanvasContext = canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
        this.swapChain = context.configureSwapChain({
            device: device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT
        });
    }
}