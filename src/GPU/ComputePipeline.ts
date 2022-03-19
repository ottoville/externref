import shaders from "../shaders.json" assert { type: "json" };
import type { GPU } from "../GPU.js";
import { BindGroup } from "./BindGroup.js";

export class ComputePipeline {
    pipeline: GPUComputePipeline;
    constructor(private gpu: GPU, private shader: keyof typeof shaders, layout?: GPUPipelineLayout, private entryPoint = 'main') {
        const shaderModule = gpu.shaderModules[shader];
        if (!shaderModule)
            throw (new Error('Shader ' + shader + ' not found'));
        const desc: GPUComputePipelineDescriptor = {
            compute: {
                module: shaderModule,
                entryPoint
            },
            label:shader+' '+entryPoint
        };
        if (layout)
            desc.layout = layout;
        this.pipeline = gpu.device.createComputePipeline(desc);
    }
    createBindGroup(layout: number | GPUBindGroupLayout, label: string, entries: () => Iterable<GPUBindGroupEntry>) {
        return new BindGroup(this.gpu,
            layout instanceof GPUBindGroupLayout ? layout : this.pipeline.getBindGroupLayout(layout),
            this.shader+' '+this.entryPoint+' '+label,
            entries
        )
    }
}