import { createSimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
export const createSimpleVertShader2 = Object.freeze([
  'simple.vert',
  createSimpleVertShader,
] as const);
export const SimpleRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
    pick: 'pick',
  },
});
