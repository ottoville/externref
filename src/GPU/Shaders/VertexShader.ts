import type { BindGroupLayout } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import type { GPU } from "../../GPU.js"

export type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];

export abstract class VertexShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    BU extends VertexBuffers = VertexBuffers,
    B extends readonly BindGroupLayout[] = readonly BindGroupLayout[],
> {
    
    module: GPUShaderModule;
    wgsl: string;
    constructor(
        gpu: GPU,
        public readonly bindLayouts: Readonly<B>,
        public buffers: BU,
        wgsl: string,
        public entryPoints: E,
        label: string,
        groupOffset = 0
        ) {
        const groups = bindLayouts.reduce((groupstring, group, gi) => {
            return group.entries.reduce((acc, binding, bi) => {
                let qualifiers = '';
                if (binding.entry.buffer) {
                    if (binding.entry.buffer.type === 'uniform') {
                        qualifiers = '<uniform>';
                    }
                    else if (binding.entry.buffer.type === 'read-only-storage') {
                        qualifiers = '<storage, read>';
                    } else {
                        qualifiers = '<storage, read_write>';
                    }
                }
                return `${acc}@group(${gi + groupOffset}) @binding(${bi}) var${qualifiers} ${binding.variableName} : ${binding.structName};\n`
            }, groupstring)
        }, '\n');
        this.wgsl = groups + wgsl;
        this.module = gpu.device.createShaderModule(
            {
              code: this.wgsl,
              label,
              hints: entryPoints
            });
    }
}
