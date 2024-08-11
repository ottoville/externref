import { createGroundVertShader } from '../Shaders/Ground.vert.js';
import { createGroundFragShader } from '../Shaders/Ground.frag.js';
import { RenderPipelineProps0 } from 'GPU/RenderPipeline.js';

export const createGroundVertShader2 = Object.freeze([
  'ground.vert',
  createGroundVertShader,
] as const);
export const createGroundFragShader2 = Object.freeze([
  'ground.frag',
  createGroundFragShader,
] as const);
export const TerrainRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
    pick: 'pick',
  },
} as RenderPipelineProps0<
  ReturnType<typeof createGroundVertShader>,
  ReturnType<typeof createGroundFragShader>
>);
