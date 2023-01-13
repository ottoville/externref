import { BufLayout, Struct } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";

export type ShaderParams<E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }> = {
    pipelineLayout: PipelineLayout,
    wgsl: string,
    entryPoints: E,
    label: string,
}

export abstract class Shader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }
> {
    readonly module: GPUShaderModule;
    readonly wgsl: string;
    protected pipelineLayout: PipelineLayout
    public readonly entryPoints: E
    constructor(
        { 
            pipelineLayout,
            wgsl,
            entryPoints,
            label,
        }: ShaderParams<E>,
        shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE
    ) {
        this.pipelineLayout = pipelineLayout;
        this.entryPoints = entryPoints;
        const structs: Set<Struct> = new Set();
        const groups = pipelineLayout.bindGroupLayouts.reduce((groupstring, group, gi) => {
            return group.entries.reduce((acc, binding, bi) => {
                if ((binding.entry.visibility & shaderFlag) === 0) {
                    return acc;
                }
                let qualifiers = '';
                if (binding instanceof BufLayout) {
                    if (binding.entry.buffer.type === 'uniform') {
                        qualifiers = '<uniform>';
                    }
                    else if (binding.entry.buffer.type === 'read-only-storage') {
                        qualifiers = '<storage, read>';
                    } else {
                        qualifiers = '<storage, read_write>';
                    }
                    if (binding.struct!.depedencies) {
                        binding.struct!.depedencies.forEach(depedency => {
                            structs.add(depedency);
                        })
                    }
                    structs.add(binding.struct!);
                }
                return `${acc}@group(${gi}) @binding(${bi}) var${qualifiers} ${binding.variableName} : ${binding.structName};\n`
            }, groupstring)
        }, '\n');
        const structString = [...structs].reduce((s, struct) =>
            `${s}struct ${struct.name} {\n${struct.struct}\n}\n`
            , '')
        //
        this.wgsl = groups + structString + wgsl;
        this.module = pipelineLayout.gpu.device.createShaderModule(
            {
                code: this.wgsl,
                label,
                hints: entryPoints
            });
    }
}
