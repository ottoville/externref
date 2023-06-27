// Non pickable single color shader where color is set from vertice
// See Simple.frag.ts for pickable counterpart
// See SingleColor.frag.ts for pickable shared single color for all vertices

import { BGLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import { FragmentShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';

export function createColorFragmentShader<B extends readonly BGLayout[]>(pipelineLayout: PipelineLayout<B>) {
    return new FragmentShader<B>({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        label: 'color.frag',
        gpu: pipelineLayout.gpu,
        entryPoints: {
            main: new FragmentShaderFunction(
                new Struct('Output', { Diffuse: ['@location(0)', 'vec4<f32>'] }),
                pipelineLayout,
                `@location(0) color:vec3<f32>`,
                () => /* wgsl */`
        var output:Output;
        output.Diffuse = vec4<f32>(color,1.0);
        return output;`)
        }
    })
}
