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
      gpu.shaders.positionAndTimeBindGroup,
      vertexBufferProps.stride * 4,
    );
    return Object.freeze({
      builder: createRenderPipelineBuilder(
        vertexShader,
        gpu.shaders.ColorShader,
      ),
      connections: {
        main: 'main',
      },
      label,
      primitive,
    });
  },
] as const);
