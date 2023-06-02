/**
 * This file is to test typescript types so that some combinations of types are not allowed.
 * This file is not intent to build or include in any build.
 */

import { Texture, TextureUsageEnums } from "GPU/Texture";
import type { Engine } from "../engine.js";
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