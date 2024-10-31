/**
 * This file is to test typescript types so that some combinations of types are not allowed.
 * This file is not intent to build or include in any build.
 */

import type { Engine } from '../engine.js';
import { SunRenderPipeline } from '../GPU/RenderPipeLines/Sun.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import { createWaterVertShader } from '../GPU/Shaders/Water.vert.js';
import { Texture, TextureUsageEnums } from '../webgpu-ts/Texture.js';
import { createSimpleVertShader } from 'GPU/Shaders/SingleColoredWithNormal.vert.js';
import type { GPU } from '../GPU.js';
import { createSunVertShader } from 'GPU/Shaders/Sun.vert.js';
import { createSingleColorFragShader } from 'GPU/Shaders/SingleColor.frag.js';
import { TextureView } from 'webgpu-ts/TextureView.js';
declare const engine: Engine;

new Texture({
  format: 'r8unorm',
  gpu: engine.gpu!.device,
  label: 'normalsTexture',
  size: {
    depthOrArrayLayers: 1,
    height: 100,
    width: 100,
  },
  //@ts-expect-error format "r8unorm" is not allowed with STORAGE_BINDING
  usages: TextureUsageEnums['STORAGE_BINDING'],
});
new Texture({
  format: 'r8unorm',
  gpu: engine.gpu!.device,
  label: 'normalsTexture',
  size: {
    depthOrArrayLayers: 1,
    height: 100,
    width: 100,
  },
  //@ts-expect-error format "r8unorm" is not allowed with STORAGE_BINDING
  usages: TextureUsageEnums['STORAGE_BINDING|COPY_SRC'],
});
//This should be fine
const text1 = new Texture({
  format: 'rgba8unorm',
  gpu: engine.gpu!.device,
  label: 'normalsTexture',
  size: {
    depthOrArrayLayers: 1,
    height: 100,
    width: 100,
  },
  usages: TextureUsageEnums['STORAGE_BINDING'],
  viewFormats: ['r32float', 'rg32float'],
});

// Should be ok
new TextureView(text1, 'rgba8unorm');
// Should be ok
new TextureView(text1, 'r32float');
//@ts-expect-error format is not listed in texture viewformats
new TextureView(text1, 'astc-10x10-unorm');

//This should be fine
const text2 = new Texture({
  format: 'astc-10x10-unorm',
  gpu: engine.gpu!.device,
  label: 'test',
  size: {
    height: 100,
    width: 100,
  },
  usages: TextureUsageEnums['COPY_DST'],
});

declare const commandEncoder: GPUCommandEncoder;
//@ts-expect-error text1 should not have copy_dst flag.
text1.copyFrom(commandEncoder, text2, {}, {}, [2, 2]);
//@ts-expect-error text1 should not have copy_src flag.
text1.copyTo(commandEncoder, text2, {}, {}, [2, 2]);
text2.copyFrom(
  commandEncoder,
  //@ts-expect-error text2 dont have copy_src flag.
  text2,
  {},
  {},
  [2, 2],
);
new Texture({
  format: 'astc-10x10-unorm',
  gpu: engine.gpu!.device,
  label: 'test',
  size: {
    width: 100,
  },
  //@ts-expect-error RenderTarget cannot be one dimensional
  usages: TextureUsageEnums['RENDER_ATTACHMENT'],
});
//This should be fine
const text3 = new Texture({
  format: 'astc-10x10-unorm',
  gpu: engine.gpu!.device,
  label: 'test',
  size: {
    height: 100,
    width: 100,
  },
  usages: TextureUsageEnums['COPY_SRC'],
});
//@ts-expect-error text3 should not have copy_dst flag
text3.copyFrom(commandEncoder, text2, {}, {}, [2, 2]);

text3.copyTo(
  commandEncoder,
  //@ts-expect-error text1 dont have copyDst flag
  text1,
  {},
  {},
  [2, 2],
);

const primitiveState = {
  frontFace: 'cw',
  topology: 'triangle-strip',
  stripIndexFormat: 'uint32',
} satisfies GPUPrimitiveState;

engine.gpu!.createRenderPipelineBuilder({
  desc: {
    connections: {
      main: 'main',
      pick: 'pick',
    },
    primitive: {
      frontFace: 'cw',
      //@ts-expect-error needs stripIndexFormat
      topology: 'triangle-strip',
    },
  },
  vertexShaderBuilder: createSimpleVertShader,
  fragmentShaderBuilder: (_gpu: GPU) => {
    return engine.gpu!.simpleFragShader;
  },
});
//Should be fine
const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
  {
    desc: {
      connections: {
        main: 'main',
        pick: 'pick',
      },
      primitive: primitiveState,
    },
    vertexShaderBuilder: createSimpleVertShader,
    fragmentShaderBuilder: (_gpu: GPU) => {
      return engine.gpu!.simpleFragShader;
    },
  },
  'uint32',
);
new DrawableIndexed({
  //@ts-expect-error todo
  node: {},
  renderPasses: new Set([]),
  renderPipeline,
  // @ts-expect-error The renderPipeline needs vertexBuffer
  vertexBuffers: [] as [],
});

engine.gpu!.createRenderPipelineBuilder(
  {
    desc: {
      ...SunRenderPipeline,
      primitive: {
        cullMode: 'none',
        //@ts-expect-error Cannot have stripIndexFormat
        topology: 'triangle-list',
      },
    },
    vertexShaderBuilder: createSunVertShader,
    fragmentShaderBuilder: createSingleColorFragShader,
  },
  'uint32',
);
engine.gpu!.createRenderPipelineBuilder({
  desc: {
    ...SunRenderPipeline,
    primitive: {
      cullMode: 'none',
      topology: 'triangle-list',
    },
  },
  vertexShaderBuilder: createSunVertShader,
  fragmentShaderBuilder: createSingleColorFragShader,
});
//Should be fine
const renderPipeline2 = engine.gpu!.createRenderPipelineBuilder(
  {
    desc: {
      ...SunRenderPipeline,
      primitive: {
        cullMode: 'none',
        topology: 'triangle-strip',
      },
    },
    vertexShaderBuilder: createSunVertShader,
    fragmentShaderBuilder: createSingleColorFragShader,
  },
  'uint32',
);

new DrawableSimple({
  //@ts-expect-error todo
  node: {},
  renderPasses: new Set([]),
  renderPipeline: renderPipeline2,
  //@ts-expect-error The renderpipeline does not need vertexBuffer
  vertexBuffers: [new Float32Array()],
});

createWaterVertShader(engine.gpu!);
