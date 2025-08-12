import { Rust_Iterator, rust_iterator_to_js, stringFromPtr } from '../utils.js';
import type { Engine } from '../engine.js';
import { Externref } from '../externref.js';
import { BGLayout, ShaderStage } from '../webgpu-ts/index.js';

declare const engine: Engine;
export const DeviceExports = {
  create_bind_group(
    { externref: device }: Externref<true, GPUDevice>,
    layout: BGLayout | GPUBindGroupLayout,
    label_vec_ptr: rust_pointer<'label'>,
    iterator: Rust_Iterator<number>,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    const groupIterator = rust_iterator_to_js(
      iterator,
      0,
      engine.rust.iterate_bindings,
    );
    const entries = Iterator.from(groupIterator).map<GPUBindGroupEntry>(
      (ptr, i) => {
        const [index, offset, size] = new Uint32Array(
          engine.rust.memory.buffer,
          ptr,
          3,
        );
        return {
          binding: i,
          resource: {
            buffer: (
              engine.rust.externrefs.get(index!) as Externref<false, GPUBuffer>
            ).externref,
            offset: offset!,
            size: size!,
          },
        };
      },
    );
    return device.createBindGroup({
      entries,
      label,
      layout: layout instanceof BGLayout ? layout.layout : layout,
    });
  },

  create_bind_group_layout(
    { externref: device }: Externref<true, GPUDevice>,
    label_vec_ptr: rust_pointer<'label'>,

    iterator: Rust_Iterator<number>,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
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
    type: number, // 0: "uniform" | 1: "storage" |  2: "read-only-storage"
    hasDynamicOffset: number,
    minBindingSize: number,
  ): GPUBindGroupLayoutEntry {
    return {
      binding,
      buffer: {
        hasDynamicOffset: hasDynamicOffset > 0 ? true : false,
        minBindingSize,
        type:
          type === 0 ? 'uniform' : type === 1 ? 'storage' : 'read-only-storage',
      },
      visibility,
    };
  },
  create_gpu_buffer(
    { externref: device }: Externref<true, GPUDevice>,
    size: number,
    label_vec_ptr: rust_pointer<'label'>,
    usage: number,
    mappedAtCreation: boolean,
    ownedByJS: boolean,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return new Externref(
      ownedByJS,
      device.createBuffer({
        label,
        mappedAtCreation,
        size,
        usage,
      }),
    );
  },
  create_gpu_command_encoder(
    { externref: device }: Externref<true, GPUDevice>,
    label_vec_ptr: rust_pointer<'label'>,
  ): GPUCommandEncoder {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return device.createCommandEncoder({ label });
  },
};
