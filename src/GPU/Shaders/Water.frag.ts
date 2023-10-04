import type { GPU } from '../../GPU.js';
import { WaterInput, diffuseOutput } from './structs/Structs.js';
import {
  FragmentShaderFunction,
  type SampLayout,
  type ShaderStage,
  type TextLayout,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';

export function createWaterFragShader(
  pipelineLayout: GPU['bindGroupTextureWater'],
) {
  const main = new FragmentShaderFunction<
    readonly [
      // eslint-disable-next-line @typescript-eslint/ban-types
      {},
      // eslint-disable-next-line @typescript-eslint/ban-types
      {},
      // eslint-disable-next-line @typescript-eslint/ban-types
      {},
      {
        diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
        mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
      },
    ]
  >(
    diffuseOutput,
    ([
      ,
      ,
      ,
      /*{ uniforms, }*/ /*{ scene, clusters_array, meshes, projection, }*/ /*{ world, }*/ {
        mySampler,
        diffuseTexture,
      },
    ]) => /* wgsl */ `                
              var output:Output;
              let uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);
          
              output.Diffuse=textureSample(${diffuseTexture}, ${mySampler}, uv);
          
              return output;
  
          `,
    WaterInput,
  );
  return new ShaderBuilder([pipelineLayout])
    .addFunction('main', main)
    .build('Water.frag');
}
