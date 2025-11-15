import { Rust_Iterator, rust_iterator_to_js } from '../utils.js';
import type { Engine } from '../engine.js';
import { ShaderStage } from '../webgpu-ts/index.js';
import {
  textureFormatMapping,
  viewDimensionMapping,
} from './TextureInterface.js';

declare const engine: Engine;

const textDecoder = new TextDecoder();

const sampleTypeMapping = [
  'float',
  'unfilterable-float',
  'depth',
  'sint',
  'uint',
] as const;
const bufferBindingTypeMapping = [
  'uniform',
  'storage',
  'read-only-storage',
] as const;
export const DeviceExports = {
  create_bind_group(device: GPUDevice, descriptor: GPUBindGroupDescriptor) {
    return device.createBindGroup(descriptor);
  },
  create_bind_group_layout(
    device: GPUDevice,
    label_ptr: number,
    label_len: number,
    iterator: Rust_Iterator<number>,
  ) {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    const groupIterator = rust_iterator_to_js(
      iterator,
      -1,
      engine.rust.iterate_binding_layouts,
    );
    const entries = Iterator.from(groupIterator).map<GPUBindGroupLayoutEntry>(
      (index) => {
        return engine.rust.externrefs.get(index) as GPUBindGroupLayoutEntry;
      },
    );
    return device.createBindGroupLayout({ entries, label });
  },
  create_bind_group_layout_entry_buffer(
    binding: number,
    visibility: ShaderStage,
    type: number,
    hasDynamicOffset: number,
    minBindingSize: number,
  ): GPUBindGroupLayoutEntry {
    return {
      binding,
      buffer: {
        hasDynamicOffset: hasDynamicOffset > 0 ? true : false,
        minBindingSize,
        type: bufferBindingTypeMapping[type]!,
      },
      visibility,
    };
  },
  create_bind_group_layout_entry_texture(
    binding: number,
    visibility: ShaderStage,
    sampleType: number,
    viewDimension: number,
    multisampled: number,
  ): GPUBindGroupLayoutEntry {
    return {
      binding,
      texture: {
        multisampled: multisampled > 0 ? true : false,
        sampleType: sampleTypeMapping[sampleType]!,
        viewDimension: viewDimensionMapping[viewDimension]!,
      },
      visibility,
    };
  },
  create_buffer(
    device: GPUDevice,
    size: number,
    label_ptr: number,
    label_len: number,
    usage: number,
    mappedAtCreation: boolean,
  ) {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return device.createBuffer({
      label,
      mappedAtCreation,
      size,
      usage,
    });
  },
  create_gpu_command_encoder(
    device: GPUDevice,
    label_ptr: number,
    label_len: number,
  ): GPUCommandEncoder {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return device.createCommandEncoder({ label });
  },
  create_texture(
    device: GPUDevice,
    width: number,
    height: number,
    depthOrArrayLayers: number,
    label_ptr: number,
    label_len: number,
    usage: number,
    mipLevelCount: number,
    sampleCount: number,
    dimension: 1 | 2 | 3,
    format: number,
    viewformats_ptr: number,
    viewformats_len: number,
  ): GPUTexture {
    const viewFormats = Array.from(
      new Uint32Array(
        engine.rust.memory.buffer,
        viewformats_ptr,
        viewformats_len,
      ),
    ).map((mapping) => textureFormatMapping[mapping]!);
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return device.createTexture({
      dimension: (dimension + 'd') as `${typeof dimension}d`,
      format: textureFormatMapping[format]!,
      label,
      mipLevelCount,
      sampleCount,
      size: {
        depthOrArrayLayers,
        height,
        width,
      },
      usage,
      viewFormats,
    });
  },
  destroy(device: GPUDevice) {
    device.destroy();
  },
};
