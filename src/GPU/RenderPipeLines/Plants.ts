import type { CreateRenderPipelineProps } from '../../GPU.js';
import {
  createGrassVertShader,
  positionAttr,
  shapeAttr,
  vertexPositionAttr,
} from '../Shaders/Grass.vert.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const PlantsRenderPipeline = [
  'PlantsRenderPipeline',
  function PlantsRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createGrassVertShader(gpu.shaders.rootCameralayout, [
      {
        arrayStride: vertexBufferProps.stride * 4,
        attributes2: positionAttr,
        stepMode: 'instance',
      },
      {
        arrayStride: 4 * 4,
        attributes2: shapeAttr,
        stepMode: 'instance',
      },
      {
        arrayStride: 8,
        attributes2: vertexPositionAttr,
        stepMode: 'vertex',
      },
    ]);
    return Object.freeze({
      builder: createRenderPipelineBuilder(
        vertexShader,
        gpu.shaders.ColorShader,
      ),
      connections: {
        main: 'main',
      },
      label,
      primitive,
    });
  },
] as const;
