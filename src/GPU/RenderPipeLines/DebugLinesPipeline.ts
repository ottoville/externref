import { RenderPipeline } from '../RenderPipeline.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createDebugBoundingBoxVertShader } from '../Shaders/devtools/debug_boundingbox.vert.js';

export const DebugLinesPipeline = Object.freeze([
  'DebugLinesPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createDebugBoundingBoxVertShader(
      gpu.positionAndTimeBindGroup,
      vertexBufferProps.stride * 4,
    );
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
        connections: {
          main: 'main',
        },
        descriptor: {
          primitive,
        },
        fragmentShader: gpu.colorFragShader,
        label,
        vertexShader,
      },
      undefined,
    );
  },
] as const);
