import type { GPU } from "../GPU.js";
import type { BindGroupLayout } from "./BindGroupLayout.js";
import type { RenderBundleEncoder } from "./RenderBundleEncoder.js";

export class BindGroup {
    #dirty=true;
    #bindGroup: GPUBindGroup;
    readonly #renderPasses: Set<RenderBundleEncoder> = new Set();
    getForRenderPass(renderBundleEncoder: RenderBundleEncoder) {
        this.#renderPasses.add(renderBundleEncoder);
        return this.bindGroup;
    }
    destroy() {
        this.#renderPasses.forEach(rp => rp.destroy());
        this.#dirty=true;
    }
    //TODO: set private
    get bindGroup() {
        if(this.#dirty) {
            const entries=this.entriesf(this);
            this.#bindGroup = this.gpu.device.createBindGroup({
                layout: this.layout.layout,
                entries,
                label: this.label
            });
            this.#dirty=false;
        }
        return this.#bindGroup;
    }
    constructor(private gpu: GPU, public layout:  BindGroupLayout, private label: string, private entriesf: (bindGroup: BindGroup) => Iterable<GPUBindGroupEntry>) {
        this.#bindGroup=this.bindGroup;
    }
}