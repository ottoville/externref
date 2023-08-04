import type { BGLayout, MapToGPUBindGroupEntry } from './BindGroupLayout.js';
import type { RenderBundleEncoder } from './RenderBundleEncoder.js';

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
                        binding: i,
                        resource: entry,
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
        private entriesf: (bindGroup: BindGroup) =>  Readonly<MapToGPUBindGroupEntry<L['entries']>>) {
    }
}