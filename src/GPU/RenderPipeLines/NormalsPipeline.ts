import { LegacyRenderPipeline } from '../RenderPipeline.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createDebugNormalsVertShader } from '../Shaders/devtools/debug_normals.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const NormalsPipeline = Object.freeze([
  'NormalsPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return new LegacyRenderPipeline({
      builder: createRenderPipelineBuilder(
        createDebugNormalsVertShader(
          gpu.positionAndTimeBindGroup,
          vertexBufferProps.stride * 4,
        ),
        gpu.colorFragShader,
      ),
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
