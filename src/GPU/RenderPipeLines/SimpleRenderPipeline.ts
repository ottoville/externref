import { simpleAttributes } from '../Shaders/structs/Attributes.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import { RenderPipeline } from '../RenderPipeline.js';

export const SimpleRenderPipeline = [
  'SimpleRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createSimpleVertShader(gpu.positionAndTimeBindGroup, {
      arrayStride: vertexBufferProps.stride * 4,
      attributes2: simpleAttributes,
      stepMode: 'vertex',
    });
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
        connections: {
          main: 'main',
          pick: 'pick',
        },
        fragmentShader: gpu.simpleFragShader,
        label,
        renderPipeline: {
          primitive,
        },
        vertexShader,
      },
      undefined,
    );
  },
] as const;
