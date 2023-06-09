/**
 * This file is to test typescript types so that some combinations of types are not allowed.
 * This file is not intent to build or include in any build.
 */

import { Texture, TextureUsageEnums } from "GPU/Texture";
import type { Engine } from "../engine.js";
import { SimpleRenderPipeline } from "../GPU/RenderPipeLines/Simple.js";
import { SunRenderPipeline } from "../GPU/RenderPipeLines/Sun.js";
import { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
declare const engine: Engine;

Texture.create({
    label: 'normalsTexture',
    size: { width: 100, height: 100, depthOrArrayLayers: 1 },
    format: 'r8unorm',
    gpu: engine.gpu!,
    //@ts-expect-error format "r8unorm" is not allowed with STORAGE_BINDING
    usages: TextureUsageEnums["STORAGE_BINDING"]
});
Texture.create({
    label: 'normalsTexture',
    size: { width: 100, height: 100, depthOrArrayLayers: 1 },
    format: 'r8unorm',
    gpu: engine.gpu!,
    //@ts-expect-error format "r8unorm" is not allowed with STORAGE_BINDING
    usages: TextureUsageEnums["STORAGE_BINDING|COPY_SRC"]
});
//This should be fine
const text1 = Texture.create({
    label: 'normalsTexture',
    size: { width: 100, height: 100, depthOrArrayLayers: 1 },
    format: 'rgba8unorm',
    gpu: engine.gpu!,
    usages: TextureUsageEnums["STORAGE_BINDING"]
});
//@ts-expect-error text1 should not have copy_dst flag.
console.log(text1.copyFrom);
//@ts-expect-error text1 should not have copy_src flag.
console.log(text1.copyTo)
//This should be fine
const text2 = Texture.create({
    format: 'astc-10x10-unorm',
    size: { width: 100, height: 100 },
    label: 'test',
    gpu: engine.gpu!,
    usages: TextureUsageEnums["COPY_DST"]
});
//This should be fine
console.log(text2.copyFrom)
Texture.create({
    format: 'astc-10x10-unorm',
    size: { width: 100 },
    label: 'test',
    gpu: engine.gpu!,
    //@ts-expect-error RenderTarget cannot be one dimensional
    usages: TextureUsageEnums["RENDER_ATTACHMENT"]
});
//This should be fine
const text3 = Texture.create({
    format: 'astc-10x10-unorm',
    size: { width: 100, height: 100 },
    label: 'test',
    gpu: engine.gpu!,
    usages: TextureUsageEnums["COPY_SRC"]
});
//@ts-expect-error text3 should not have copy_dst flag
console.log(text3.copyFrom)
//Should be fine
console.log(text3.copyTo)



const primitiveState: GPUPrimitiveState = {
    frontFace: 'cw',
    topology: 'triangle-strip' };

//@ts-expect-error Needs stride
engine.gpu!.createRenderPipeline(SimpleRenderPipeline, primitiveState, undefined );
//Should be fine
const renderPipeline = engine.gpu!.createRenderPipeline(SimpleRenderPipeline, primitiveState, { stride: 4 } );
new DrawableIndexed(
    {
        renderPipeline,
        renderPasses: new Set([]),
        //@ts-expect-error The renderPipeline needs vertexBuffer
        vertexBuffers: [] as [],
        //@ts-ignore
        node: {},
    }
)

//@ts-expect-error Cannot have stride
engine.gpu!.createRenderPipeline(SunRenderPipeline, {
    topology: 'triangle-strip',
    cullMode: 'none',
    stripIndexFormat: 'uint16'
}, { stride: 8 });

//Should be fine
const renderPipeline2 = engine.gpu!.createRenderPipeline(SunRenderPipeline, {
    topology: 'triangle-strip',
    cullMode: 'none',
    stripIndexFormat: 'uint16'
}, undefined);

new DrawableSimple({
    renderPipeline: renderPipeline2,
    renderPasses: new Set([]),
    //@ts-expect-error The renderpipeline does not need vertexBuffer
    vertexBuffers: [new Float32Array()],
    //@ts-ignore
    node: {},
})