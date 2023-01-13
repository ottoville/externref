import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';

//////////////////////////////////

const wgsl = /* wgsl */ `
struct Output {
  @location(0) Diffuse : vec4<f32>
};

@fragment
fn main(@location(0) color:vec3<f32>) -> Output {
  var output:Output;
  //outColor = vec4<f32>(color,1.0);

  output.Diffuse = vec4<f32>(color,1.0);

  return output;
}
  `;
//////////////

export class ColorFragShader extends FragmentShader<
  { main: PipelineLayout }> {
  constructor(pipelineLayout: PipelineLayout) {
    super({
      pipelineLayout,
      wgsl,
      entryPoints: {
        main: pipelineLayout
      }, label: 'Color.frag'
    });

  }
}