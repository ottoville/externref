import type { BGLayout } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import type { GPU } from "../../GPU.js"



export abstract class Shader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    B extends readonly BGLayout[] = readonly BGLayout[],
> {

    readonly module: GPUShaderModule;
    readonly wgsl: string;
    constructor(
        public gpu: GPU,
        public readonly bindLayouts: Readonly<B>,
        wgsl: string,
        public readonly entryPoints: E,
        label: string,
        shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE,
    ) {
        const structs:Set<string> = new Set();
        const groups = bindLayouts.reduce((groupstring, group, gi) => {
            return group.entries.reduce((acc, binding, bi) => {
                if ((binding.entry.visibility & shaderFlag) === 0) {
                    return acc;
                }
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
                if(binding.struct) {
                    structs.add(`struct ${binding.structName} {\n${binding.struct}\n}`);
                }
                return `${acc}@group(${gi}) @binding(${bi}) var${qualifiers} ${binding.variableName} : ${binding.structName};\n`
            }, groupstring)
        }, '\n');
        this.wgsl = groups + [...structs].join('\n') +  wgsl;
        this.module = gpu.device.createShaderModule(
            {
                code: this.wgsl,
                label,
                hints: entryPoints
            });
    }
}
