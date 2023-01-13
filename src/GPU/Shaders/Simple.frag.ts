//TODO: Make actual shading to diverse this shader from color.frag

import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';

//////////////////////////////////

const wgsl = /* wgsl */ `
struct Output {
  @location(0) Diffuse : vec4<f32>
};

@fragment
fn main(
  @location(0)  normal : vec3<f32>,
  @location(1) @interpolate(flat)  id : u32,
  @location(2) color:vec3<f32>
) -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(color,1.0);
  return output;
}

struct OutputPick {
  @location(0) ID : u32
};

@fragment
fn pick(
  @location(0) @interpolate(flat)  id : u32
) -> OutputPick {
  var output:OutputPick;
  output.ID = id;
  return output;
}
  `;
//////////////
type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>]

export class SimpleFragShader extends FragmentShader<
  { main: PipelineLayout, pick: PipelineLayout }> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
    super({
      pipelineLayout,
      wgsl,
      entryPoints: {
        main: pipelineLayout,
        pick: pipelineLayout
      }, label: 'Simple.frag'
    });

  }
}