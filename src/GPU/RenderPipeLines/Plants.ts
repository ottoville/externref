import type { CreateRenderPipelineProps } from '../../GPU.js';
import {
  createGrassVertShader,
  positionAttr,
  shapeAttr,
  vertexPositionAttr,
} from '../Shaders/Grass.vert.js';
import { createColorFragmentShader } from '../Shaders/Color.frag.js';
import { LegacyRenderPipeline } from '../RenderPipeline.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const PlantsRenderPipeline = [
  'PlantsRenderPipeline',
  function PlantsRenderPipeline(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const vertexShader = createGrassVertShader(gpu.rootCameralayout, [
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
    const fragmentShader = createColorFragmentShader(gpu.rootCameralayout);
    return new LegacyRenderPipeline(
      {
        bindgroupdrawable: gpu.rootCameralayout,
        builder: createRenderPipelineBuilder(vertexShader, fragmentShader),
        connections: {
          main: 'main',
        },
        descriptor: {
          primitive,
        },
        fragmentShader,
        label,
        vertexShader,
      },
      undefined,
    );
  },
] as const;
