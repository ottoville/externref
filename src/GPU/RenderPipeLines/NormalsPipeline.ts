import { createDebugNormalsVertShader } from '../Shaders/devtools/debug_normals.vert.js';
export const createDebugNormalsVertShader2 = Object.freeze([
  'DebugNormals.vert',
  createDebugNormalsVertShader,
] as const);
export const NormalsPipeline = Object.freeze({
  connections: {
    main: 'main',
  },
} as const);
