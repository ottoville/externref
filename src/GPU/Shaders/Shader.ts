import { type BGLayout, BufLayout, type ShaderStage, BindGroupLayoutEntry } from '../BindGroupLayout.js';
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
    protected getFilteredBindGroups(shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE) {
        return this.props.bindGroupLayouts.map(bl => {
            return bl.entries.filter(ee => {
                return (ee.entry.visibility & shaderFlag) !== 0
            })
        });
    }
    constructor(
        public props: ShaderParams<E>,
        shaderFlag: typeof GPUShaderStage.VERTEX | typeof GPUShaderStage.FRAGMENT | typeof GPUShaderStage.COMPUTE,
        constantCode?: ((...b: BindGroupLayoutEntry<ShaderStage>[][]) => string) | undefined) {
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

        const bindGroups = this.getFilteredBindGroups(shaderFlag)
        if(constantCode)
            this.wgsl+=constantCode(...bindGroups)
        const pipelineLayouts:{[index: string]: GPUShaderModuleCompilationHint} = {}
        for(const key in props.entryPoints) {
            const entryPoint = props.entryPoints[key]!;
            this.wgsl += entryPoint.createCode(bindGroups,
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
