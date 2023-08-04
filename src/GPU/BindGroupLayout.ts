import type { GPU } from '../GPU.js';
import type { Struct } from './Shaders/structs/Structs.js';


export interface GPUBindGroupTextureEntry {
    texture: GPUTextureBindingLayout;
}
export type MapToGPUBindGroupEntry<T extends {[index:string]: BindGroupLayoutEntry}> = {
    [K in keyof T]: T[K] extends TextLayout<ShaderStage, TextLayoutFormats> ? GPUTextureView | GPUExternalTexture :
    T[K] extends BufLayout ? GPUBufferBinding
    : GPUBindingResource };
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
export abstract class BindGroupLayoutEntry<V extends ShaderStage = ShaderStage, F extends string = string> {
    // Each shader will set this variableName to right context when creating wgsl
    variableName = '';
    constructor(
        public entry: BindGroupLayoutEntryProps<V>,
        public structName: F) {
    }
    toString() {
        return this.variableName;
    }
}
export class BufLayout<V extends ShaderStage = ShaderStage, S extends Struct = Struct> extends BindGroupLayoutEntry<V> {
    constructor(
        public override entry: BindGroupLayoutEntryProps<V> & {
            buffer: GPUBufferBindingLayout & { minBindingSize: GPUSize64 }
        },
        public struct: S
    ) {

        super(entry,
            struct.name);
    }
    prop(member: keyof S['properties'] & string) {
        return `${this.variableName}.${member}`;
    }
}

type format = 'f32' | 'i32' | 'u32';
/**
 * https://www.w3.org/TR/WGSL/#storage-texel-formats
 */
type storageFormat = 'rgba8unorm' | 'rgba8snorm' | 'rgba8uint' | 'rgba8sint' | 'rgba16uint' | 'rgba16sint' | 'rgba16float' | 'r32uint' | 'r32sint' | 'r32float' | 'rg32uint' | 'rg32sint' | 'rg32float' | 'rgba32uint' | 'rgba32sint' | 'rgba32float' | 'bgra8unorm';

abstract class AbstractTextureLayout<V extends ShaderStage = ShaderStage, F extends string = string> extends BindGroupLayoutEntry<V, F> {
    constructor(
        entry:
            BindGroupLayoutEntryProps<V> &
            ({ texture: Omit<NonNullable<GPUBindGroupLayoutEntry['texture']>, 'viewDimension'> } |
            { storageTexture: Omit<NonNullable<GPUBindGroupLayoutEntry['storageTexture']>, 'viewDimension'> }),
        structName: F
    ) {
        const wsglType = structName.split('<')[0]!;
        const types = [
            '1d',
            '2d',
            '2d_array',
            'cube',
            'cube_array',
            '3d'
        ] as const;
        const layoutType = types.find(type =>
            wsglType.endsWith(type)
        )!;
        if(entry.texture) {
            entry.texture.viewDimension = layoutType!.replace('_',
                '-') as GPUTextureViewDimension;
        } else if(entry.storageTexture) {
            entry.storageTexture.viewDimension = layoutType!.replace('_',
                '-') as GPUTextureViewDimension;
        }
        super(
            entry,
            structName);
    }
}

export class StorageTextLayout<V extends ShaderStage = ShaderStage> extends AbstractTextureLayout<V> {
    constructor(
        public override entry:
            BindGroupLayoutEntryProps<V> &
            { storageTexture: NonNullable<GPUBindGroupLayoutEntry['storageTexture']> },
        structName:
        // Storage Texture Types https://www.w3.org/TR/WGSL/#texture-storage
        // TODO: allow read-write https://github.com/gpuweb/gpuweb/issues/1772
            | `texture_storage_1d<${storageFormat},write>`
            | `texture_storage_2d<${storageFormat},write>`
            | `texture_storage_2d_array<${storageFormat},write>`
            | `texture_storage_3d<${storageFormat},write>`
    ) {
        super(entry,
            structName);
    }
}
type TextLayoutFormats =         //sampled texture types https://www.w3.org/TR/WGSL/#sampled-texture-type
| `texture_2d<${format}>`
| `texture_2d_array<${format}>`
| `texture_3d<${format}>`
| `texture_cube<${format}>`
| `texture_cube_array<${format}>`
//multisampled texture types https://www.w3.org/TR/WGSL/#multisampled-texture-type
   | `texture_multisampled_2d<${format}>`
   | 'texture_depth_multisampled_2d'
//External Sampled Texture Types https://www.w3.org/TR/WGSL/#external-texture-type
| 'texture_external';

export class TextLayout<V extends ShaderStage, F extends TextLayoutFormats> extends AbstractTextureLayout<V, F> {
    constructor(
        public override entry:
            Omit<BindGroupLayoutEntryProps<V>, 'texture'> &
                { texture: Omit<NonNullable<GPUBindGroupLayoutEntry['texture']>, 'viewDimension'> },
        structName: F
    ) {
        super(
            entry,
            structName);
    }
}

type SamplerFormats = 'sampler' | 'sampler_comparison';

export class SampLayout<V extends ShaderStage, F extends SamplerFormats> extends BindGroupLayoutEntry<V, F> {
    constructor(
        public override entry: BindGroupLayoutEntryProps<V> & { sampler: NonNullable<GPUBindGroupLayoutEntry['sampler']> },
        structName: F
    ) {
        super(entry,
            structName);
    }
}

export class BGLayout<T extends {[index:string]: BindGroupLayoutEntry} = {[index:string]: BindGroupLayoutEntry}> {
    layout: GPUBindGroupLayout;
    dynamicIndices = false;
    entries: Readonly<T>;
    constructor(public gpu: GPU, label: string, entries: T) {
        const entriesArr = Object.values(entries);
        this.layout = gpu.device.createBindGroupLayout({
            entries: entriesArr.map((entry, i) => {
                return {
                    ...entry.entry,
                    binding: i,
                };
            }),
            label,
        });
        this.entries = entries;
        for (const e of entriesArr) {
            if (e.entry.buffer && e.entry.buffer.hasDynamicOffset) {
                this.dynamicIndices = true;
                break;
            }
        }
    }
}