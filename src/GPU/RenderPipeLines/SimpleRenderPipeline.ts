import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { LegacyRenderPipeline } from '../RenderPipeline.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return new LegacyRenderPipeline({
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
      descriptor: {
        primitive,
      },
      label,
    });
  },
] as const;
