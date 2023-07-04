import type { BGLayout } from './BindGroupLayout.js';
import type { RenderBundleEncoder } from './RenderBundleEncoder.js';
import type { RenderPass } from './RenderPasses/RenderPass.js';

export class BindGroup<L extends BGLayout = BGLayout> {
    #dirty = true;
    #bindGroup?: GPUBindGroup;
    readonly #renderBundles: Set<RenderBundleEncoder> = new Set();
    getForRenderBundle(renderBundleEncoder: RenderBundleEncoder) {
        this.#renderBundles.add(renderBundleEncoder);
        return this.bindGroup;
    }
    destroy() {
        this.#renderBundles.forEach(bundle =>
            bundle.destroy());
        this.#dirty = true;
    }
    //TODO: set private
    get bindGroup(): GPUBindGroup {
        if (this.#dirty || !this.#bindGroup) {
            const entries = this.entriesf(this);
            this.#bindGroup = this.layout.gpu.device.createBindGroup({
                entries: Object.values(entries).map((entry, i) =>
                    ({
                        ...entry,
                        binding: i,
                    })),
                label: this.label,
                layout: this.layout.layout,
            });
            this.#dirty = false;
        }
        return this.#bindGroup;
    }
    constructor(
        public layout: L,
        private label: string,
        private entriesf: (bindGroup: BindGroup) => {[index: string] : Omit<GPUBindGroupEntry, 'binding'>},
        readonly renderPasses: Set<RenderPass> = new Set()) {
        this.renderPasses.forEach(rp =>
            rp.bundles.forEach(bundle => {
                this.#renderBundles.add(bundle);
            }));
    }
}