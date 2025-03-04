import { BindGroup } from '../webgpu-ts/index.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const BindCommandsInterface = {
  set_bindgroup(
    resource_index: number,
    index: number,
    bindgroup: BindGroup | GPUBindGroup,
  ) {
    const resource = engine.rust.externrefs.get(
      resource_index,
    ) as GPUBindingCommandsMixin;
    resource.setBindGroup(
      index,
      bindgroup instanceof BindGroup ? bindgroup.bindGroup : bindgroup,
    );
  },
};
