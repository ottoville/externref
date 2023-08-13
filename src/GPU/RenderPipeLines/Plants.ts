import { GPU } from '../../GPU.js';
import {
  createGrassVertShader,
  positionAttr,
  shapeAttr,
  vertexPositionAttr,
} from '../Shaders/Grass.vert.js';
import { createColorFragmentShader } from '../Shaders/Color.frag.js';

export const PlantsRenderPipeline = [
  'PlantsRenderPipeline',
  function PlantsRenderPipeline(
    gpu: GPU,
    label: string,
    primitive: GPUPrimitiveState,
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
    return gpu.rootCameralayout.addRenderPipeline({
      connections: {
        main: 'main',
      },
      fragmentShader,
      label,
      renderPipeline: {
        primitive,
      },
      vertexShader,
    });
  },
] as const;
