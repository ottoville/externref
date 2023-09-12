/**
 * This file is to test typescript types so that some combinations of types are not allowed.
 * This file is not intent to build or include in any build.
 */

import type { Engine } from '../engine.js';
import { SimpleRenderPipeline } from '../GPU/RenderPipeLines/SimpleRenderPipeline.js';
import { SunRenderPipeline } from '../GPU/RenderPipeLines/Sun.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import { LegacyRenderPipeline } from '../GPU/RenderPipeline.js';
import { createWaterFragShader } from '../GPU/Shaders/Water.frag.js';
import { createWaterVertShader } from '../GPU/Shaders/Water.vert.js';
import { positionAttr } from '../GPU/Shaders/structs/Attributes.js';
import { Texture, TextureUsageEnums } from '../webgpu-ts/Texture.js';
import { createRenderPipelineBuilder } from 'webgpu-ts/index.js';
declare const engine: Engine;

Texture.create({
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
Texture.create({
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
const text1 = Texture.create({
  format: 'rgba8unorm',
  gpu: engine.gpu!.device,
  label: 'normalsTexture',
  size: {
    depthOrArrayLayers: 1,
    height: 100,
    width: 100,
  },
  usages: TextureUsageEnums['STORAGE_BINDING'],
});
//This should be fine
const text2 = Texture.create({
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
Texture.create({
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
const text3 = Texture.create({
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

const primitiveState: GPUPrimitiveState = {
  frontFace: 'cw',
  topology: 'triangle-strip',
};

//@ts-expect-error Needs stride
engine.gpu!.createRenderPipeline(
  SimpleRenderPipeline,
  primitiveState,
  undefined,
);
//Should be fine
const renderPipeline = engine.gpu!.createRenderPipeline(
  SimpleRenderPipeline,
  primitiveState,
  {
    stride: 4,
  },
);
new DrawableIndexed({
  //@ts-ignore
  node: {},
  renderPasses: new Set([]),
  renderPipeline,
  // @ts-expect-error The renderPipeline needs vertexBuffer
  vertexBuffers: [] as [],
});

//@ts-expect-error Cannot have stride
engine.gpu!.createRenderPipeline(
  SunRenderPipeline,
  {
    cullMode: 'none',
    stripIndexFormat: 'uint16',
    topology: 'triangle-strip',
  },
  {
    stride: 8,
  },
);

//Should be fine
const renderPipeline2 = engine.gpu!.createRenderPipeline(
  SunRenderPipeline,
  {
    cullMode: 'none',
    stripIndexFormat: 'uint16',
    topology: 'triangle-strip',
  },
  undefined,
);

new DrawableSimple({
  //@ts-ignore
  node: {},
  renderPasses: new Set([]),
  renderPipeline: renderPipeline2,
  //@ts-expect-error The renderpipeline does not need vertexBuffer
  vertexBuffers: [new Float32Array()],
});

const waterVertShader = createWaterVertShader(
  engine.gpu!.bindGroupTextureWater,
  {
    arrayStride: 16,
    attributes2: positionAttr,
    stepMode: 'vertex',
  },
);
new LegacyRenderPipeline({
  bindgroupdrawable: engine.gpu!.bindGroupTextureWater,
  builder: createRenderPipelineBuilder(
    waterVertShader,
    createWaterFragShader(engine.gpu!.bindGroupTextureWater),
  ),
  connections: {
    main: 'main',
  },
  descriptor: {},
  fragmentShader: createWaterFragShader(engine.gpu!.bindGroupTextureWater),
  label: 'test',
  vertexShader: waterVertShader,
});
new LegacyRenderPipeline({
  bindgroupdrawable: engine.gpu!.positionAndTimeBindGroup,
  builder: createRenderPipelineBuilder(
    waterVertShader,
    createWaterFragShader(engine.gpu!.bindGroupTextureWater),
  ),
  connections: {
    main: 'main',
  },
  descriptor: {},
  fragmentShader: createWaterFragShader(engine.gpu!.bindGroupTextureWater),
  label: 'test',
  vertexShader: waterVertShader,
});
