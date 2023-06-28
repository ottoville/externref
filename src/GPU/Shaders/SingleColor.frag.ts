// Non pickable shared single color for all vertices
// TODO: Make actual shading

import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from '../../GPU.js'
import { FragmentShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';
type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts']

export class SingleColorFragShader extends FragmentShader<
BindLayouts> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new FragmentShaderFunction(
                    new Struct('Output',
                        {
                            Diffuse: ['@location(0)', 'vec4<f32>'],
                        }),
                    pipelineLayout,
                    '',
                    ([
                        [/*uniforms*/,],
                        [/*scene, time, clusters_array, meshes, projection*/,],
                        [world]
                    ]) => /* wgsl */ `
                    var output:Output;
                    output.Diffuse = vec4<f32>(${world.prop('color')}, 1.0);
                    return output;
              `),
            },
            gpu: pipelineLayout.gpu,
            label: 'SingleColor.frag',
        });
    }
}