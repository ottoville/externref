import type { GPU } from '../../GPU.js';
import { UI_Input, diffuseOutput } from './structs/Structs.js';
import { textureLoad } from './std_functions.js';
import {
  FragmentShader,
  FragmentShaderFunction,
  type ShaderStage,
  type TextLayout,
} from '../../webgpu-ts/index.js';

export function createUIFragmentShader(gpu: GPU) {
  return new FragmentShader({
    entryPoints: {
      main: new FragmentShaderFunction<
        [
          {
            texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
          },
        ]
      >(
        diffuseOutput,
        UI_Input,
        ([{ texture }]) => /* wgsl */ `
                    let fragCoordI=vec2<i32>(floor(v_uv));
                    let color:vec4<f32> = ${textureLoad(
                      texture,
                      'fragCoordI',
                      '0',
                    )};
                
                    var output:Output;
                
                    //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
                    output.Diffuse=color;
                    return output;
        
                `,
      ),
    },
    label: 'UI.frag',
    pipelineLayouts: [gpu.canvasRootLayout],
  });
}
export type UIFragShader = ReturnType<typeof createUIFragmentShader>;
