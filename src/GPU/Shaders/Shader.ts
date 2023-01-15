import { BufLayout, Struct } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";

export type ShaderParams<E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    P extends PipelineLayout = PipelineLayout> = {
        pipelineLayout: P,
        entryPoints: E,
        label: string,
    }

export abstract class Shader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    P extends PipelineLayout = PipelineLayout
> {
    module!: GPUShaderModule;
    wgsl: string;
    constructor(
        protected props: ShaderParams<E, P>,
        shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE,
    ) {
        const structs: Set<Struct> = new Set();
        const groups = props.pipelineLayout.bindGroupLayouts.reduce((groupstring, group, gi) => {
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
                    if (binding.struct.depedencies) {
                        binding.struct.depedencies.forEach(depedency => {
                            structs.add(depedency);
                        })
                    }
                    structs.add(binding.struct);
                }
                return `${acc}@group(${gi}) @binding(${bi}) var${qualifiers} ${binding.variableName} : ${binding.structName};\n`
            }, groupstring)
        }, '\n');
        const structString = [...structs].reduce((s, struct) =>
            `${s}struct ${struct.name} {\n${struct.struct}\n}\n`
            , '')
        //
        this.wgsl = groups + structString;
    }
    //@ts-expect-error
    protected createWGSL<B extends P["bindGroupLayouts"]>(cb: (...args: { [K in keyof B]: B[K]["entries"] }) => string) {
        //@ts-expect-error https://stackoverflow.com/a/57913509
        this.wgsl += cb(...this.props.pipelineLayout.bindGroupLayouts.map(bl => bl.entries));
        this.module = this.props.pipelineLayout.gpu.device.createShaderModule(
            {
                code: this.wgsl,
                label: this.props.label,
                hints: this.props.entryPoints
            });

    }
}
