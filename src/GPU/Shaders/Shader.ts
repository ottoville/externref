import { type BGLayout, BufLayout, BindGroupLayoutEntry } from '../BindGroupLayout.js';
import type { Struct } from './structs/Structs.js';
import type { GPU } from '../../GPU.js'
import { ComputeShaderFunction, type ShaderFunction } from './ShaderFunction.js';

export type ShaderParams<E extends { [index: string]: ShaderFunction } = { [index: string]: ShaderFunction },
    B extends readonly BGLayout[] = readonly BGLayout[]> = {
        bindGroupLayouts: B,
        entryPoints: E,
        label: string,
        gpu: GPU
    }
export abstract class Shader<
    E extends { [index: string]: ShaderFunction } = { [index: string]: ShaderFunction },
> {
    module: GPUShaderModule;
    wgsl: string;
    constructor(
        public props: ShaderParams<E>,
        shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE,
        constantCode?: ((
            b: Readonly<{
                [index: string]: BindGroupLayoutEntry;
            }>[]) => string) | undefined) {
        const structs: Set<Struct> = new Set();
        const groups = props.bindGroupLayouts.reduce((groupstring, group, gi) => {
            return Object.entries(group.entries).reduce((acc, [variableName, binding], bi) => {
                if ((binding.entry.visibility & shaderFlag) === 0) {
                    return acc;
                }
                const uniqueName = `g${gi}_${variableName}`
                binding.variableName = uniqueName;
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
                        //@ts-expect-error https://github.com/microsoft/TypeScript/issues/28560
                        (binding.struct as Struct).depedencies.forEach(depedency => {
                            structs.add(depedency);
                        })
                    }
                    structs.add(binding.struct);
                }
                return `${acc}@group(${gi}) @binding(${bi}) var${qualifiers} ${uniqueName} : ${binding.structName};\n`
            },
            groupstring)
        },
        '\n');
        const outputs: Struct[] = [];
        for(const key in props.entryPoints) {
            const entryPoint = props.entryPoints[key]!;
            if(!(entryPoint instanceof ComputeShaderFunction)) {
                outputs.push(entryPoint.output);
            }
        }
        const structString = [...structs, ...outputs].reduce((s, struct) => {
            let properties = '';
            for (const property in struct.properties) {
                properties += `${struct.properties[property]![0]} ${property}: ${struct.properties[property]![1]},\n`
            }
            return `${s}struct ${struct.name} {\n${properties}}\n`;
        },
        '')
        //
        this.wgsl = groups + structString;


        const entries = this.props.bindGroupLayouts.map(bl =>
            bl.entries
        )
        if(constantCode)
            this.wgsl+=constantCode(entries)
        const pipelineLayouts:{[index: string]: GPUShaderModuleCompilationHint} = {
        }
        for(const key in props.entryPoints) {
            const entryPoint = props.entryPoints[key]!;
            //@ts-expect-error
            this.wgsl += entryPoint.createCode(entries,
                key);
            pipelineLayouts[key] = entryPoint.pipelineLayout

        }
        this.module = this.props.gpu.device.createShaderModule(
            {
                code: this.wgsl,
                hints: pipelineLayouts,
                label: this.props.label,
            });
    }
}
