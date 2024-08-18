import { createVertexColorShader } from '../Shaders/VertexColoredWithNormal.vert.js';
import type { GPU } from '../../GPU.js';
export const createSimpleColoredVertShader2 = Object.freeze([
  'simpleColored.vert',
  createVertexColorShader,
] as const);
export const createSimpleFragShader2 = (gpu: GPU) => {
  return gpu.simpleFragShader;
};
export const ColoredRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
    pick: 'pick',
  },
});
