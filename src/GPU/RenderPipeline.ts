import type { GPU } from "../GPU.js";
import type shaders from "../shaders.json";

export class Shader {
    module: GPUShaderModule;
    constructor(gpu: GPU, shader: keyof typeof shaders) {
        const module = gpu.shaderModules[shader];
        if (!module)
            throw (new Error('shader ' + shader + ' not found'));
        this.module = module;
    }
}


