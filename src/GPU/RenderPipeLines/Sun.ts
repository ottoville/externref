export const SunRenderPipeline = Object.freeze({
  connections: {
    main: 'main' as const,
  },
  depthBuffer: {
    depthCompare: 'always' as GPUCompareFunction,
    depthWriteEnabled: false,
  },
});
