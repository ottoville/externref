import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const RenderCommandsInterface = {
  draw_indexed(
    resource_index: number,
    indexCount: GPUSize32,
    instanceCount: GPUSize32,
    firstIndex: GPUSize32,
    baseVertex: GPUSignedOffset32,
    firstInstance: GPUSize32,
  ) {
    const resource = engine.rust.externrefs.get(
      resource_index,
    ) as GPURenderCommandsMixin;
    resource.drawIndexed(
      indexCount,
      instanceCount,
      firstIndex,
      baseVertex,
      firstInstance,
    );
  },
  set_indexbuffer(
    resource_index: number,
    buffer: GPUBuffer,
    indexFormat: 16 | 32,
    offset: GPUSize64,
    size: GPUSize64,
  ) {
    const resource = engine.rust.externrefs.get(
      resource_index,
    ) as GPURenderCommandsMixin;
    resource.setIndexBuffer(buffer, `uint${indexFormat}`, offset, size);
  },
};
