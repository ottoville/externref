import type { GPU } from '../../GPU.js';
import { UI_Input, diffuseOutput } from './structs/Structs.js';
import {
  FragmentShaderFunction,
  textureLoad,
  type ShaderStage,
  type TextLayout,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';

export function createUIFragmentShader(gpu: GPU) {
  return new ShaderBuilder([gpu.canvasRootLayout])
    .addFunction(
      'main',
      new FragmentShaderFunction<
        [
          {
            texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
          },
        ]
      >(
        diffuseOutput,
        ([{ texture }]) => /* wgsl */ `
              let fragCoordI=vec2<i32>(floor(v_uv));
              let color:vec4<f32> = ${textureLoad(texture, 'fragCoordI', '0')};
          
              var output:Output;
          
              //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
              output.Diffuse=color;
              return output;
  
          `,
        UI_Input,
      ),
    )
    .build('UI.frag');
}
export type UIFragShader = ReturnType<typeof createUIFragmentShader>;
