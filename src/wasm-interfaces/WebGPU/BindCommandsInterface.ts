import { BindGroup } from '../../webgpu-ts/index.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const BindCommandsInterface = {
  set_bindgroup(
    resource_index: number,
    index: number,
    bindgroup: BindGroup | GPUBindGroup,
    dynamicOffsetsDataStart: GPUSize64,
    dynamicOffsetsDataLength: GPUSize32,
  ) {
    const resource = engine.rust.externrefs.get(
      resource_index,
    ) as GPUBindingCommandsMixin;
    resource.setBindGroup(
      index,
      bindgroup instanceof BindGroup ? bindgroup.bindGroup : bindgroup,
      // TODO: cache view
      new Uint32Array(engine.rust.memory.buffer),
      dynamicOffsetsDataStart / 4,
      dynamicOffsetsDataLength,
    );
  },
};
