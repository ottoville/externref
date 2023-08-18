import { positionAttr } from '../Shaders/structs/Attributes.js';
import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createWaterVertShader } from '../../GPU/Shaders/Water.vert.js';
import { createWaterFragShader } from '../Shaders/Water.frag.js';
import { RenderPipeline } from '../RenderPipeline.js';

export const WaterRenderPipeline = [
  'WaterRenderPipeline',
  function create(
    { gpu, label, primitive }: CreateRenderPipelineProps,
    vertexBufferProps: { stride: number },
  ) {
    //TODO: Reuse sampler with terrain.ts?
    const sampler = gpu.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
    });

    const waterVertShader = createWaterVertShader(gpu.bindGroupTextureWater, {
      arrayStride: vertexBufferProps.stride * 4,
      attributes2: positionAttr,
      stepMode: 'vertex',
    });

    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.bindGroupTextureWater,
        connections: {
          main: 'main',
        },
        descriptor: {
          primitive,
        },
        fragmentShader: createWaterFragShader(gpu.bindGroupTextureWater),
        label,
        vertexShader: waterVertShader,
      },
      () => ({
        diffuseTexture: gpu.renderPassWater.colorRenderTargets.diffuse.view,
        mySampler: sampler,
      }),
    );
  },
] as const;
