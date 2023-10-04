import type { GPU } from '../../GPU.js';
import { UI_Input, diffuseOutput } from './structs/Structs.js';
import {
  FragmentShader,
  FragmentShaderFunction,
  type ShaderStage,
  type TextLayout,
  textureLoad,
} from '../../webgpu-ts/index.js';

export function createUIFragmentShaderArray(gpu: GPU) {
  return new FragmentShader({
    entryPoints: {
      array: new FragmentShaderFunction<
        [
          {
            texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d_array<f32>'>;
          },
        ]
      >(
        diffuseOutput,
        ([{ texture }]) => /* wgsl */ `
                    let fragCoordI=vec2<i32>(floor(v_uv));
                    let color:vec4<f32> = ${textureLoad(
                      texture,
                      'fragCoordI',
                      '0',
                      '0',
                    )};
                
                    var output:Output;
                
                    //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
                    output.Diffuse=color;
                    return output;
        
                `,
        UI_Input,
      ),
    },
    label: 'UI.frag',
    pipelineLayouts: [gpu.canvasRootLayoutArray],
  });
}
export type UIFragShaderArray = ReturnType<typeof createUIFragmentShaderArray>;
