import { createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';

export const createSunVertShader2 = Object.freeze([
  'sun.vert',
  createSunVertShader,
] as const);

export const createSunFragShader2 = Object.freeze([
  'sun.frag',
  createSingleColorFragShader,
] as const);
export const SunRenderPipeline = Object.freeze({
  connections: {
    main: 'main',
  },
  depthBuffer: {
    depthCompare: 'always' as GPUCompareFunction,
    depthWriteEnabled: false,
  },
});
