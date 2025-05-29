export const RenderPassEncoderInterface = {
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
