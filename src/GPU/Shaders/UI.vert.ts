import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js'
type BindLayouts = readonly [GPU["BindGroupLayoutCanvas"]]

export class UIVertShader extends VertexShader<
  { main: PipelineLayout },
  [GPUVertexBufferLayout],
  BindLayouts> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {

    super({
      bindGroupLayouts: pipelineLayout.bindGroupLayouts,
      entryPoints: {
        main: pipelineLayout
      },
      label: 'UI.vert'
    }, [buffers]);
    this.createWGSL(([uniforms, /*texture*/]) => {
      //////////////////////////////////

      return /* wgsl */ `
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
  output.Position = vec4<f32>(${uniforms.variableName}.translate + position, 1.0, 1.0);
  output.v_uv=uv;
  return output;

}
  `;
      //////////////

    })
  }
}