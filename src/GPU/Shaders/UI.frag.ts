import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';

type BindLayouts = readonly [
  BGLayout<[
    BufLayout<ShaderStage.VERTEX>,
    TextLayout<ShaderStage.FRAGMENT>]>
  ]

export class UIFragShader extends FragmentShader<
  { main: PipelineLayout, pick: PipelineLayout }, BindLayouts> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
    super({
      bindGroupLayouts: pipelineLayout.bindGroupLayouts,
      entryPoints: {
        main: pipelineLayout,
        pick: pipelineLayout
      }, label: 'UI.frag'
    });
    this.createWGSL((
      [texture]) => {

      //////////////////////////////////

      return  /* wgsl */ `
      struct Output {
        @location(0) Color : vec4<f32>
      };
      @fragment
      fn main(
        @builtin(position) fragCoord : vec4<f32>,
        @location(0) v_uv : vec2<f32>,
      ) -> Output {
        let fragCoordI=vec2<i32>(floor(v_uv));
        let color:vec4<f32> = textureLoad(${texture.variableName}, fragCoordI, 0);
      
        var output:Output;
      
        //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
        output.Color=color;
        return output;
      }
      
  `;
      //////////////
    })
  }
}