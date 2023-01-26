import { BGLayout, BufLayout, ShaderStage } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import { Struct } from "./structs/Structs.js";

export type ShaderParams<E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    B extends readonly BGLayout[] = readonly BGLayout[]> = {
        bindGroupLayouts: B,
        entryPoints: E,
        label: string,
    }
export abstract class Shader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    B extends readonly BGLayout[] = readonly BGLayout[]
> {
    module!: GPUShaderModule;
    wgsl: string;
    constructor(
        public props: ShaderParams<E, B>,
        private shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE,
    ) {
        const structs: Set<Struct> = new Set();
        const groups = props.bindGroupLayouts.reduce((groupstring, group, gi) => {
            return group.entries.reduce((acc, binding, bi) => {
                if ((binding.entry.visibility & shaderFlag) === 0) {
                    return acc;
                }
                let qualifiers = '';
                if (binding instanceof BufLayout) {
                    //Bug in TS?
                    const binding2 = binding as BufLayout<ShaderStage, Struct>
                    if (binding2.entry.buffer.type === 'uniform') {
                        qualifiers = '<uniform>';
                    }
                    else if (binding2.entry.buffer.type === 'read-only-storage') {
                        qualifiers = '<storage, read>';
                    } else {
                        qualifiers = '<storage, read_write>';
                    }
                    if (binding2.struct.depedencies) {
                        binding2.struct.depedencies.forEach(depedency => {
                            structs.add(depedency);
                        })
                    }
                    structs.add(binding2.struct);
                }
                return `${acc}@group(${gi}) @binding(${bi}) var${qualifiers} ${binding.variableName} : ${binding.structName};\n`
            }, groupstring)
        }, '\n');
        const structString = [...structs].reduce((s, struct) => {
            let properties = '';
            for (const property in struct.properties) {
                properties += `${struct.properties[property]![0]} ${property}: ${struct.properties[property]![1]},\n`
            }
            return `${s}struct ${struct.name} {\n${properties}}\n`;
        }, '')
        //
        this.wgsl = groups + structString;
    }
    protected createWGSL(cb: (...args: { [K in keyof B]: B[K]["entries"] }) => string) {

        const entries = this.props.bindGroupLayouts.map(bl => bl.entries) as unknown as { [K in keyof B]: B[K]["entries"] };

        const filtered = entries.map((e) => {
            return e.filter(ee => {
                return (ee.entry.visibility & this.shaderFlag) !== 0
            })
        })
        //@ts-expect-error https://stackoverflow.com/a/57913509
        this.wgsl += cb(...filtered);
        this.module = this.props.bindGroupLayouts[0]!.gpu.device.createShaderModule(
            {
                code: this.wgsl,
                label: this.props.label,
                hints: this.props.entryPoints
            });

    }
}
