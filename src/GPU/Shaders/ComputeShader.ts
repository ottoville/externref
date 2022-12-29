import type { BindGroupLayout2 } from "../BindGroupLayout2.js";
import type { PipelineLayout } from "../PipelineLayout.js";
import type { GPU } from "../../GPU.js"
export abstract class ComputeShader<
B extends BindGroupLayout2[] = BindGroupLayout2[],
E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }
> {
    abstract entryPoints: E;
    abstract module: GPUShaderModule;
    groups: string[][];
    constructor(public gpu: GPU, public readonly bindLayouts: Readonly<B>) {
        this.groups = bindLayouts.map((group, gi) => {
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
}
