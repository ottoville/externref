// Non pickable shared single color for all vertices
// TODO: Make actual shading

import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';

//////////////////////////////////

const wgsl = /* wgsl */ `

struct Output {
  @location(0) Diffuse : vec4<f32>
};

@fragment
fn main() -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(world.color, 1.0);
  return output;
}

  `;
//////////////
type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>]

export class SingleColorFragShader extends FragmentShader<
  { main: PipelineLayout }> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
    super({
      pipelineLayout,
      wgsl,
      entryPoints: {
        main: pipelineLayout,
      }, label: 'SingleColor.frag'
    });

  }
}