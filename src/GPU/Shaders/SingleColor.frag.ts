// Non pickable shared single color for all vertices
// TODO: Make actual shading

import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from '../../GPU.js'
type BindLayouts = GPU["positionAndTimeBindGroup"]["bindGroupLayouts"]

export class SingleColorFragShader extends FragmentShader<
BindLayouts, { main: PipelineLayout }> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout,
            },
            label: 'SingleColor.frag',
            gpu: pipelineLayout.gpu
        });
        this.createWGSL((
            [/*uniforms*/,],
            [/*scene, time, clusters_array, meshes, projection*/,],
            [world]) => {
            //////////////////////////////////

            return /* wgsl */ `

struct Output {
  @location(0) Diffuse : vec4<f32>
};

@fragment
fn main() -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(${world.variableName}.color, 1.0);
  return output;
}

  `;
            //////////////
        })

    }
}