import type {
  CreateRenderPipelineProps,
  VertexBufferProps,
} from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: VertexBufferProps,
  ) {
    return Object.freeze({
      builder: createRenderPipelineBuilder(
        createSimpleVertShader(
          gpu.shaders.positionAndTimeBindGroup,
          vertexBufferProps.stride * 4,
        ),
        gpu.simpleFragShader,
      ),
      connections: {
        main: 'main',
        pick: 'pick',
      },
      label,
      primitive,
    });
  },
] as const;
