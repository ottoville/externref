import type { GPU } from '../../GPU.js';
import { UI_Input, diffuseOutput } from './structs/Structs.js';
import {
  FragmentShaderFunction,
  textureLoad,
  type ShaderStage,
  type TextLayout,
  FragmentShaderBuilder,
} from '../../webgpu-ts/index.js';

export function createUIFragmentShader(gpu: GPU) {
  return new FragmentShaderBuilder(
    [gpu.pipelineLayouts.canvasRootLayout],
    'UI.frag',
  )
    .addFunction(
      'main',
      new FragmentShaderFunction(
        diffuseOutput,
        ([{ texture }], { v_uv }) => /* wgsl */ `
              let fragCoordI=vec2<i32>(floor(${v_uv}));
              let color:vec4<f32> = ${textureLoad(texture, 'fragCoordI', 0)};
          
              var output:Output;
          
              //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
              output.Diffuse=color;
              return output;
  
          `,
        UI_Input,
      ) satisfies FragmentShaderFunction<
        readonly [
          {
            texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
          },
        ]
      >,
    )
    .build();
}
export type UIFragShader = ReturnType<typeof createUIFragmentShader>;
