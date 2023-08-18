import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { RenderPipeline } from '../RenderPipeline.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
        connections: {
          main: 'main',
          pick: 'pick',
        },
        descriptor: {
          primitive,
        },
        fragmentShader: gpu.simpleFragShader,
        label,
        vertexShader: createSimpleVertShader(
          gpu.positionAndTimeBindGroup,
          vertexBufferProps.stride * 4,
        ),
      },
      undefined,
    );
  },
] as const;
