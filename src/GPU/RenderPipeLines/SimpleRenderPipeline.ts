import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return Object.freeze({
      builder: createRenderPipelineBuilder(
        createSimpleVertShader(
          gpu.positionAndTimeBindGroup,
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
