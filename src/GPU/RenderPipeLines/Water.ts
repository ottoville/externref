import { positionAttr } from '../Shaders/structs/Attributes.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createWaterVertShader } from '../../GPU/Shaders/Water.vert.js';
import { createWaterFragShader } from '../Shaders/Water.frag.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const WaterRenderPipeline = [
  'WaterRenderPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    const waterVertShader = createWaterVertShader(gpu.bindGroupTextureWater, {
      arrayStride: vertexBufferProps.stride * 4,
      attributes2: positionAttr,
      stepMode: 'vertex',
    });
    const waterFragShader = createWaterFragShader(gpu.bindGroupTextureWater);

    const builder = createRenderPipelineBuilder(
      waterVertShader,
      waterFragShader,
    );
    return Object.freeze({
      builder,
      connections: {
        main: 'main',
      },
      label,
      primitive,
    });
  },
] as const;
