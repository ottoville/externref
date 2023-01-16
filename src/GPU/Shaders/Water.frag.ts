import { BGLayout, BufLayout, SampLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from "GPU.js"
type BindLayouts = [
  GPU["sizeBindGroupLayout"],
  GPU["uniformBindGroupLayoutWithTime"],
  BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT>]>,
  BGLayout<[SampLayout<ShaderStage.FRAGMENT>, TextLayout<ShaderStage.FRAGMENT>]>];

export class WaterFragShader extends FragmentShader<
  { main: PipelineLayout, pick: PipelineLayout }, BindLayouts> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
    super({
      bindGroupLayouts: pipelineLayout.bindGroupLayouts,
      entryPoints: {
        main: pipelineLayout,
        pick: pipelineLayout
      }, label: 'Simple.frag'
    });
    this.createWGSL((
      [/*uniforms*/,],
      [/*scene, time, clusters_array, meshes, projection*/,],
      [/*world*/,],
      [mySampler, diffuseTexture,]) => {

      //////////////////////////////////

      return  /* wgsl */ `
      struct Output {
        @location(0) Diffuse : vec4<f32>
      };
      
      //[[location(1)]] var<in> ambient: vec3<f32>;
      
      @fragment
      fn main(@location(0) v_uv : vec4<f32>,
        @location(1) position : vec3<f32>,
        @location(2) @interpolate(flat) id : u32) -> Output {
      
        var output:Output;
        let uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);
      
        output.Diffuse=textureSample(${diffuseTexture.variableName}, ${mySampler.variableName}, uv);
      
        return output;
      }
  `;
      //////////////
    })
  }
}