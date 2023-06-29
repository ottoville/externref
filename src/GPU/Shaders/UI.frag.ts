import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from '../../GPU.js'
import { FragmentShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';

type BindLayouts = [
    GPU['BindGroupLayoutCanvas']
]
export function createUIFragmentShader(pipelineLayout: PipelineLayout<BindLayouts>) {
    return new FragmentShader(
        {
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new FragmentShaderFunction(new Struct('Output',
                    {
                        Color: ['@location(0)', 'vec4<f32>'],
                    }),
                pipelineLayout,
                `@builtin(position) fragCoord : vec4<f32>,
                @location(0) v_uv : vec2<f32>`,
                ([[texture]]) => /* wgsl */
                    `
                    let fragCoordI=vec2<i32>(floor(v_uv));
                    let color:vec4<f32> = textureLoad(${texture}, fragCoordI, 0);
                
                    var output:Output;
                
                    //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
                    output.Color=color;
                    return output;
        
                `),
            },
            gpu: pipelineLayout.gpu,
            label: 'UI.frag',
        }
    )
}
export type UIFragShader = ReturnType<typeof createUIFragmentShader>
