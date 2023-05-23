/**
 * This file is to test typescript types so that some combinations of types are not allowed.
 * This file is not intent to build or include in any build.
 */

import { Texture, TextureUsageEnums } from "GPU/Texture";
import type { Engine } from "../engine.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
declare const engine: Engine;

new Texture({
    label: 'normalsTexture',
    size: { width: 100, height: 100, depthOrArrayLayers: 1 },
    format: 'r8unorm',
    gpu: engine.gpu!,
    //@ts-expect-error format "r8unorm" is not allowed with STORAGE_BINDING
    usages: TextureUsageEnums["STORAGE_BINDING"]
});

new RenderTarget({
    format: 'astc-10x10-unorm',
    //@ts-expect-error RenderTarget cannot be one dimensional
    size: { width: 100 },
    label: 'test',
    gpu: engine.gpu!,
    usages: TextureUsageEnums["RENDER_ATTACHMENT"]
});