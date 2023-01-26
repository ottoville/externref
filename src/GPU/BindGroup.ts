import type { BGLayout } from "./BindGroupLayout.js";
import type { RenderBundleEncoder } from "./RenderBundleEncoder.js";
import type { RenderPass } from "./RenderPasses/RenderPass.js";

export class BindGroup<L extends BGLayout = BGLayout> {
    #dirty = true;
    #bindGroup: GPUBindGroup;
    readonly #renderBundles: Set<RenderBundleEncoder> = new Set();
    getForRenderBundle(renderBundleEncoder: RenderBundleEncoder) {
        this.#renderBundles.add(renderBundleEncoder);
        return this.bindGroup;
    }
    destroy() {
        this.#renderBundles.forEach(bundle => bundle.destroy());
        this.#dirty = true;
    }
    //TODO: set private
    get bindGroup() {
        if (this.#dirty) {
            const entries = this.entriesf(this);
            this.#bindGroup = this.layout.gpu.device.createBindGroup({
                layout: this.layout.layout,
                entries,
                label: this.label
            });
            this.#dirty = false;
        }
        return this.#bindGroup;
    }
    constructor(
        public layout: L,
        private label: string,
        private entriesf: (bindGroup: BindGroup) => Iterable<GPUBindGroupEntry>,
        readonly renderPasses: Set<RenderPass> = new Set()) {
        this.#bindGroup = this.bindGroup;
        this.renderPasses.forEach(rp => rp.bundles.forEach(bundle => {
            this.#renderBundles.add(bundle);
        }))
    }
}