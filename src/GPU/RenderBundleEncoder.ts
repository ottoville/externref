import type { RenderPass } from "./RenderPasses/RenderPass.js";
let n=0;
export class RenderBundleEncoder {
    #renderBundle:GPURenderBundle | undefined
    renderBundle(descriptor:GPURenderBundleEncoderDescriptor) {
        if(!this.#renderBundle) {
            descriptor.label=descriptor.label?.substring(0,descriptor.label.length-1)+(n++).toString();
            const renderBundleEncoder = this.renderPass.gpu.device.createRenderBundleEncoder(descriptor);
            this.record(renderBundleEncoder, this)
            this.#renderBundle = renderBundleEncoder.finish();
        }
        return this.#renderBundle;
    }
    destroy() {
        this.#renderBundle = undefined;
    }
    constructor(
        private renderPass: RenderPass,
        private record: (GPURenderBundleEncoder: GPURenderBundleEncoder,
        renderBundleEncoder: RenderBundleEncoder) => void) {
    }
}