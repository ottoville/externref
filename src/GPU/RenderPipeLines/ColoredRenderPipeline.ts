import { createVertexColorShader } from '../Shaders/VertexColoredWithNormal.vert.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { RenderPipeline } from '../RenderPipeline.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const ColoredRenderPipeline = [
  'ColoredRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
        builder: createRenderPipelineBuilder(
          createVertexColorShader(
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
        fragmentShader: gpu.simpleFragShader,
        label,
        vertexShader: createVertexColorShader(
          gpu.positionAndTimeBindGroup,
          vertexBufferProps.stride * 4,
        ),
      },
      undefined,
    );
  },
] as const;
