import { createGrassVertShader } from '../Shaders/Grass.vert.js';

export const createGrassVertShader2 = Object.freeze([
  'Grass.vert',
  createGrassVertShader,
] as const);

export const PlantsRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
  },
});
