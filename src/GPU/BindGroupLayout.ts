import type { GPU } from '../GPU.js';
import { BindGroup } from './BindGroup.js';
import type { RenderPass } from './RenderPasses/RenderPass.js';
import type { Struct } from './Shaders/structs/Structs.js';


export interface GPUBindGroupTextureEntry {
    texture: GPUTextureBindingLayout;
}
export type MapToGPUBindGroupEntry<T> = {
    [K in keyof T]: T[K] extends TextLayout ? { binding: GPUIndex32, resource: GPUTextureView | GPUExternalTexture } :
    T[K] extends BufLayout ? { binding: GPUIndex32, resource: GPUBufferBinding }
    : GPUBindGroupEntry };
export type GPUBindGroupLayoutEntryBuffer = Omit<GPUBindGroupLayoutEntry, 'binding'> & {
    buffer: GPUBufferBindingLayout & { minBindingSize: GPUSize64 }
}

export enum ShaderStage {
    VERTEX = 1,
    FRAGMENT = 2,
    COMPUTE = 4,
    VERTEX_AND_FRAGMENT = 3, //GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    COMPUTE_AND_FRAGMENT = 6, // GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT
    COMPUTE_AND_VERTEX = 5 // GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX
}
interface BindGroupLayoutEntryProps<V extends ShaderStage = ShaderStage> extends Omit<GPUBindGroupLayoutEntry, 'binding' | 'visibility'> {
    visibility: V
}
export abstract class BindGroupLayoutEntry<V extends ShaderStage = ShaderStage> {
    constructor(
        public entry: BindGroupLayoutEntryProps<V>,
        public readonly variableName: string,
        public structName: string) {
    }
    toString() {
        return this.variableName
    }
}
export class BufLayout<V extends ShaderStage = ShaderStage, S extends Struct = Struct> extends BindGroupLayoutEntry<V> {
    constructor(
        public override entry: BindGroupLayoutEntryProps<V> & {
            buffer: GPUBufferBindingLayout & { minBindingSize: GPUSize64 }
        },
        variableName: string,
        public struct: S
    ) {

        super(entry, variableName, struct.name)
    }
    prop(member: keyof S['properties'] & string) {
        return `${this.variableName}.${member}`
    }
}
export class TextLayout<V extends ShaderStage = ShaderStage> extends BindGroupLayoutEntry<V> {
    constructor(
        public override entry: BindGroupLayoutEntryProps<V> & ({ texture: NonNullable<GPUBindGroupLayoutEntry['texture']> } | { storageTexture: NonNullable<GPUBindGroupLayoutEntry['storageTexture']> }),
        variableName: string,
        structName:
            'texture_depth_multisampled_2d'
            | 'texture_2d<u32>'
            | 'texture_2d<f32>'
            | 'texture_2d_array<f32>'
            | 'texture_storage_2d<rgba8unorm,write>'
            | 'texture_storage_2d_array<rgba8unorm,write>'
            | 'texture_storage_2d<rgba32float,write>'
            | 'texture_storage_2d<rgba8sint,write>'
    ) {
        super(entry, variableName, structName)
    }
}

export class SampLayout<V extends ShaderStage = ShaderStage> extends BindGroupLayoutEntry<V> {
    constructor(
        public override entry: BindGroupLayoutEntryProps<V> & { sampler: NonNullable<GPUBindGroupLayoutEntry['sampler']> },
        variableName: string,
        structName: 'sampler' | 'sampler_comparison'
    ) {
        super(entry, variableName, structName)
    }
}

export class BGLayout<T extends BindGroupLayoutEntry[] = BindGroupLayoutEntry[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices = false;
    entries: Readonly<T>;
    constructor(public gpu: GPU, label: string, ...entries: T) {
        this.layout = gpu.device.createBindGroupLayout({
            entries: entries.map((entry, i) => {
                return {
                    ...entry.entry,
                    binding: i,
                }
            }),
            label,
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