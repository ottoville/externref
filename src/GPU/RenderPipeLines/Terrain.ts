import { createGroundVertShader } from '../Shaders/Ground.vert.js';
import { createGroundFragShader } from '../Shaders/Ground.frag.js';
import { RenderPipelineProps0 } from 'GPU/RenderPipeline.js';

export const TerrainRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
    pick: 'pick',
  },
} as RenderPipelineProps0<
  ReturnType<typeof createGroundVertShader>,
  ReturnType<typeof createGroundFragShader>
>);
