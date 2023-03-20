import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from "../../GPU.js"

type BindLayouts = [
    GPU["BindGroupLayoutCanvas"]
]

export class UIFragShader extends FragmentShader<BindLayouts,
    { main: PipelineLayout, pick: PipelineLayout }> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout,
                pick: pipelineLayout
            },
            label: 'UI.frag',
            gpu: pipelineLayout.gpu
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
        let color:vec4<f32> = textureLoad(${texture}, fragCoordI, 0);
      
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