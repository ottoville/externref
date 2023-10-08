import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';

export const SunRenderPipeline = Object.freeze([
  'SunRenderPipeline',
  function create({ gpu, label, primitive }: CreateRenderPipelineProps) {
    const vertexShader = createSunVertShader(
      gpu.shaders.positionAndTimeBindGroup,
    );
    const fragmentShader = createSingleColorFragShader(
      gpu.shaders.positionAndTimeBindGroup,
    );
    return Object.freeze({
      builder: createRenderPipelineBuilder(vertexShader, fragmentShader),
      connections: {
        main: 'main',
      },
      depthBuffer: {
        depthCompare: 'always',
        depthWriteEnabled: false,
      },
      label,
      primitive,
    } as const);
  },
] as const);
