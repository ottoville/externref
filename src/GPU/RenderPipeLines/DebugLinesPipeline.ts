import { LegacyRenderPipeline } from '../RenderPipeline.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createDebugBoundingBoxVertShader } from '../Shaders/devtools/debug_boundingbox.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const DebugLinesPipeline = Object.freeze([
  'DebugLinesPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createDebugBoundingBoxVertShader(
      gpu.positionAndTimeBindGroup,
      vertexBufferProps.stride * 4,
    );
    return new LegacyRenderPipeline({
      builder: createRenderPipelineBuilder(vertexShader, gpu.colorFragShader),
      connections: {
        main: 'main',
      },
      descriptor: {
        primitive,
      },
      label,
    });
  },
] as const);
