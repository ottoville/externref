import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createDebugNormalsVertShader } from '../Shaders/devtools/debug_normals.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const NormalsPipeline = Object.freeze([
  'NormalsPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return Object.freeze({
      builder: createRenderPipelineBuilder(
        createDebugNormalsVertShader(
          gpu.shaders.positionAndTimeBindGroup,
          vertexBufferProps.stride * 4,
        ),
        gpu.shaders.ColorShader,
      ),
      connections: {
        main: 'main',
      },
      label,
      primitive,
    } as const);
  },
] as const);
