import type { GPU } from "../GPU.js";
import { BindGroup } from "./BindGroup.js";
import type { RenderPass } from "./RenderPasses/RenderPass.js";


export interface GPUBindGroupTextureEntry {
    texture: GPUTextureBindingLayout;
}
type MapToGPUBindGroupEntry<T> = {
    [K in keyof T]: T[K] extends GPUBindGroupTextureEntry ? { binding: GPUIndex32, resource: GPUTextureView | GPUExternalTexture } : GPUBindGroupEntry };

export type GPUBindGroupLayoutEntryBuffer = Omit<GPUBindGroupLayoutEntry, 'binding'> & {
    buffer: GPUBufferBindingLayout & { minBindingSize: GPUSize64 }
}
export type GPUBindGroupLayoutEntryTexture = Omit<GPUBindGroupLayoutEntry, 'binding'> & { texture: NonNullable<GPUBindGroupLayoutEntry['texture']> }
export type GPUBindGroupLayoutEntryStorageTexture = Omit<GPUBindGroupLayoutEntry, 'binding'> & { storageTexture: NonNullable<GPUBindGroupLayoutEntry['storageTexture']> }

type GPUBindingGroupLayoytEntryStrict = (GPUBindGroupLayoutEntryBuffer | GPUBindGroupLayoutEntryTexture | GPUBindGroupLayoutEntryStorageTexture)
export class BindGroupLayout2<T extends GPUBindingGroupLayoytEntryStrict[] = GPUBindingGroupLayoytEntryStrict[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices = false;
    entries: T;
    constructor(public gpu: GPU, label: string, ...entries: T) {
        this.layout = gpu.device.createBindGroupLayout({
            label, entries: entries.map((entry, i) => {
                return {
                    ...entry,
                    binding: i
                }
            })
        });
        this.entries = entries;
        for (const e of entries) {
            if (e.buffer && e.buffer.hasDynamicOffset) {
                this.dynamicIndices = true;
                break;
            }
        }
    }
    createBindGroup(
        label: string,
        entries: (bindGroup: BindGroup) => Readonly<MapToGPUBindGroupEntry<T>>,
        renderPasses?: Set<RenderPass>): BindGroup {
        return new BindGroup(this, label, entries, renderPasses)
    }
}