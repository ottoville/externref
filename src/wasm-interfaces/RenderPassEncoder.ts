const storeOptMapping = ['store', 'discard'] as const;
export const RenderPassEncoderInterface = {
  create_render_pass_color_attachment_clear(
    view: GPUTexture | GPUTextureView,
    depthSlice: GPUIntegerCoordinate,
    resolveTarget: GPUTexture | GPUTextureView | null,
    clearValueR: number,
    clearValueG: number,
    clearValueB: number,
    clearValueA: number,
    storeOp: number,
  ): GPURenderPassColorAttachment {
    const attachment: GPURenderPassColorAttachment = {
      clearValue: [clearValueR, clearValueG, clearValueB, clearValueA],
      loadOp: 'clear',
      storeOp: storeOptMapping[storeOp]!,
      view,
    };
    if (depthSlice >= 0) {
      attachment.depthSlice = depthSlice;
    }
    if (resolveTarget !== null) {
      attachment.resolveTarget = resolveTarget;
    }
    return attachment;
  },
  create_render_pass_color_attachment_load(
    view: GPUTexture | GPUTextureView,
    depthSlice: GPUIntegerCoordinate,
    resolveTarget: GPUTexture | GPUTextureView | null,
    storeOp: number,
  ): GPURenderPassColorAttachment {
    const attachment: GPURenderPassColorAttachment = {
      loadOp: 'load',
      storeOp: storeOptMapping[storeOp]!,
      view,
    };
    if (depthSlice >= 0) {
      attachment.depthSlice = depthSlice;
    }
    if (resolveTarget !== null) {
      attachment.resolveTarget = resolveTarget;
    }
    return attachment;
  },
  create_render_pass_depth_stencil_attachment(
    view: GPUTexture | GPUTextureView,
    depthClearValue: number,
    depthReadOnly: boolean,
    stencilClearValue: number,
    stencilStoreOp_enum: number,
    depthStoreOp_enum: number,
    stencilReadOnly: boolean,
  ): GPURenderPassDepthStencilAttachment {
    const attachment: GPURenderPassDepthStencilAttachment = {
      depthClearValue,
      depthLoadOp: 'clear',
      depthReadOnly,
      depthStoreOp: storeOptMapping[depthStoreOp_enum]!,
      stencilClearValue,
      stencilLoadOp: 'clear',
      stencilReadOnly,
      stencilStoreOp: storeOptMapping[stencilStoreOp_enum]!,
      view,
    };
    return attachment;
  },
  end(commandEncoder: GPURenderPassEncoder) {
    commandEncoder.end();
  },
  execute_bundles(
    commandEncoder: GPURenderPassEncoder,
    renderbundle: GPURenderBundle,
  ) {
    commandEncoder.executeBundles([renderbundle]);
  },
};
