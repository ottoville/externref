import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { RenderPipeline } from '../RenderPipeline.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
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
