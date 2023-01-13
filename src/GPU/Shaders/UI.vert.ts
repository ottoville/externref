import { BGLayout, BufLayout, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';

//////////////////////////////////

const wgsl = /* wgsl */ `
struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
};

@vertex
fn main(
  @location(0) position : vec2<f32>,
  @location(1) uv : vec2<f32>
  ) -> Output {
  var output : Output;   
  output.Position = vec4<f32>(uniforms.translate + position, 1.0, 1.0);
  output.v_uv=uv;
  return output;

}
  `;
  //////////////
type BindLayouts = readonly [BGLayout<[BufLayout, TextLayout]>]

export class UIVertShader extends VertexShader<
{ main: PipelineLayout },
[GPUVertexBufferLayout]> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {

    super(pipelineLayout, [buffers], wgsl, {
      main: pipelineLayout
    }, 'UI.vert');

  }
}