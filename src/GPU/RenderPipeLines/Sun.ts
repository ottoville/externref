import type { CreateRenderPipelineProps } from '../../GPU.js';
import { createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';
import { createRenderPipelineBuilder } from '../../webgpu-ts/index.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';

export const SunRenderPipeline = [
  'SunRenderPipeline',
  function create({
    gpu,
    label,
    primitive,
  }: CreateRenderPipelineProps): RenderPipelineProps {
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
    }) as RenderPipelineProps;
  },
] as const;
