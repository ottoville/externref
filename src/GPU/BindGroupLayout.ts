import type { GPU } from "../GPU.js";
import { BindGroup } from "./BindGroup.js";
import type { RenderPass } from "./RenderPasses/RenderPass.js";


export interface GPUBindGroupTextureEntry {
    texture: GPUTextureBindingLayout;
}
export type MapToGPUBindGroupEntry<T> = {
    [K in keyof T]: T[K] extends TextLayout ? { binding: GPUIndex32, resource: GPUTextureView | GPUExternalTexture } : 
    GPUBindGroupEntry };
export type GPUBindGroupLayoutEntryBuffer = Omit<GPUBindGroupLayoutEntry, 'binding'> & {
    buffer: GPUBufferBindingLayout & { minBindingSize: GPUSize64 }
}
export type GPUBindGroupLayoutEntryTexture = Omit<GPUBindGroupLayoutEntry, 'binding'> & { texture: NonNullable<GPUBindGroupLayoutEntry['texture']> }
export type GPUBindGroupLayoutEntryStorageTexture = Omit<GPUBindGroupLayoutEntry, 'binding'> & { storageTexture: NonNullable<GPUBindGroupLayoutEntry['storageTexture']> }
export type GPUBindGroupLayoutEntrySampler = Omit<GPUBindGroupLayoutEntry, 'binding'> & { sampler: NonNullable<GPUBindGroupLayoutEntry['sampler']> }

export type GPUBindingGroupLayoytEntryStrict =
    (GPUBindGroupLayoutEntryBuffer
        | GPUBindGroupLayoutEntryTexture
        | GPUBindGroupLayoutEntryStorageTexture 
        | GPUBindGroupLayoutEntrySampler)

export class BindGroupLayoutEntry<T extends GPUBindingGroupLayoytEntryStrict = GPUBindingGroupLayoytEntryStrict> {
    constructor(
        public entry: T,
        public variableName: string,
        public structName: string,
        public struct?: string) {
    }
}

export type BufLayout = BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>
export type SampLayout = BindGroupLayoutEntry<GPUBindGroupLayoutEntrySampler>
export type TextLayout = BindGroupLayoutEntry<GPUBindGroupLayoutEntryTexture>

export class BGLayout<T extends BindGroupLayoutEntry[] = BindGroupLayoutEntry[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices = false;
    entries: Readonly<T>;
    constructor(public gpu: GPU, label: string, ...entries: T) {
        this.layout = gpu.device.createBindGroupLayout({
            label, entries: entries.map((entry, i) => {
                return {
                    ...entry.entry,
                    binding: i
                }
            })
        });
        this.entries = entries;
        for (const e of entries) {
            if (e.entry.buffer && e.entry.buffer.hasDynamicOffset) {
                this.dynamicIndices = true;
                break;
            }
        }
    }
    createBindGroup(
        label: string,
        entries: (bindGroup: BindGroup) => Readonly<MapToGPUBindGroupEntry<T>>,
        renderPasses?: Set<RenderPass>): BindGroup<BGLayout<T>> {
        return new BindGroup<typeof this>(this, label, entries, renderPasses)
    }
}