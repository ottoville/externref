import shaders from "../shaders.json" assert { type: "json" };
import type { GPU } from "../GPU.js";
import { BindGroup } from "./BindGroup.js";
import { BindGroupLayout } from "./BindGroupLayout.js";

export class ComputePipeline {
    pipeline: GPUComputePipeline;
    constructor(private gpu: GPU, private shader: keyof typeof shaders, layout: GPUPipelineLayout | 'auto' = 'auto', private entryPoint = 'main') {
        const shaderModule = gpu.shaderModules[shader];
        if (!shaderModule)
            throw (new Error('Shader ' + shader + ' not found'));
        this.pipeline = gpu.device.createComputePipeline({
            compute: {
                module: shaderModule,
                entryPoint
            },
            label:shader+' '+entryPoint,
            layout
        });
    }
    createBindGroup(layout: number | BindGroupLayout, label: string, entries: (bindGroup: BindGroup) => Iterable<GPUBindGroupEntry>) {
        return new BindGroup(
            layout instanceof BindGroupLayout ? layout : new BindGroupLayout(this.gpu, this.pipeline.getBindGroupLayout(layout)),
            this.shader+' '+this.entryPoint+' '+label,
            entries
        )
    }
}