import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';
import { LegacyRenderPipeline } from '../RenderPipeline.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SunRenderPipeline = [
  'SunRenderPipeline',
  function create({ gpu, label, primitive }: CreateRenderPipelineProps) {
    const vertexShader = createSunVertShader(gpu.positionAndTimeBindGroup);
    const fragmentShader = createSingleColorFragShader(
      gpu.positionAndTimeBindGroup,
    );
    return new LegacyRenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
        builder: createRenderPipelineBuilder(vertexShader, fragmentShader),
        connections: {
          main: 'main',
        },
        depthBuffer: {
          depthCompare: 'always',
          depthWriteEnabled: false,
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
