import { createDebugBoundingBoxVertShader } from '../Shaders/devtools/debug_boundingbox.vert.js';
export const createDebugLinesVertShader2 = Object.freeze([
  'DebugLines.vert',
  createDebugBoundingBoxVertShader,
] as const);

export const DebugLinesPipeline = Object.freeze({
  connections: {
    main: 'main',
  },
});
