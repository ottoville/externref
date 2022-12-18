import type { BindGroupLayout2 } from "../BindGroupLayout2.js";
import type { PipelineLayout2 } from "../PipelineLayout2.js";
import type { GPU } from "../../GPU.js"
export abstract class ComputeShader<E extends { [index: string]: PipelineLayout2 } = { [index: string]: PipelineLayout2 }> {
    abstract entryPoints: E;
    abstract module: GPUShaderModule;
    abstract bindLayouts: BindGroupLayout2[];
    constructor(public gpu: GPU) {

    }
    createComputePipeline(entryPoint: keyof E) {
        return this.gpu.device.createComputePipeline({
            compute: {
                module: this.module,
                entryPoint: entryPoint as string
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.entryPoints[entryPoint]!.layout
        });
    }
    getGroups() {
        return this.bindLayouts.map((group, gi) => {
            return group.entries.map((binding, bi) => {
                let qualifiers = '';
                if (binding.buffer) {
                    if (binding.buffer.type === 'uniform') {
                        qualifiers = '<uniform>';
                    }
                    else if (binding.buffer.type === 'read-only-storage') {
                        qualifiers = '<storage, read>';
                    } else {
                        qualifiers = '<storage, read_write>';
                    }
                }
                return `@binding(${bi}) @group(${gi}) var${qualifiers}`
            })
        });
    }
}
