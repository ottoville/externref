import { createVertexColorShader } from '../Shaders/VertexColoredWithNormal.vert.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { VertexBufferLayout2 } from '../Shaders/VertexShader.js';
import { simpleAttributes } from '../Shaders/structs/Attributes.js';
import { RenderPipeline } from '../RenderPipeline.js';

export const simpleAttributesWithColor = Object.freeze({
  ...simpleAttributes,
  color: {
    format: 'float32x3',
    offset: 32,
    shaderFormat: 'vec3<f32>',
    shaderLocation: 2,
  },
} as const);

export const ColoredRenderPipeline = [
  'ColoredRenderPipeline',
  function SimpleRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const buffers = {
      arrayStride: vertexBufferProps.stride * 4,
      attributes2: simpleAttributesWithColor,
      stepMode: 'vertex',
    } as VertexBufferLayout2<typeof simpleAttributesWithColor>;
    const vertexShader = createVertexColorShader(
      gpu.positionAndTimeBindGroup,
      buffers,
    );
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
