import { createVertexColorShader } from '../Shaders/VertexColoredWithNormal.vert.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const ColoredRenderPipeline = [
  'ColoredRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createVertexColorShader(
      gpu.shaders.positionAndTimeBindGroup,
      vertexBufferProps.stride * 4,
    );
    return Object.freeze({
      builder: createRenderPipelineBuilder(vertexShader, gpu.simpleFragShader),
      connections: {
        main: 'main',
        pick: 'pick',
      },
      label,
      primitive,
    });
  },
] as const;
