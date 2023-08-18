import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';
import { RenderPipeline } from '../RenderPipeline.js';

export const SunRenderPipeline = [
  'SunRenderPipeline',
  function create({ gpu, label, primitive }: CreateRenderPipelineProps) {
    const vertexShader = createSunVertShader(gpu.positionAndTimeBindGroup);
    const fragmentShader = createSingleColorFragShader(
      gpu.positionAndTimeBindGroup,
    );
    return new RenderPipeline(
      {
        bindgroupdrawable: gpu.positionAndTimeBindGroup,
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
