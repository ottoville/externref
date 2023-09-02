import { FragmentShader } from './FragmentShader.js';
import type { GPU } from '../../GPU.js';
import { FragmentShaderFunction } from './ShaderFunction.js';
import { UI_Input, diffuseOutput } from './structs/Structs.js';
import { textureLoad } from './std_functions.js';

export function createUIFragmentShaderArray(gpu: GPU) {
  return new FragmentShader({
    entryPoints: {
      array: new FragmentShaderFunction(
        diffuseOutput,
        gpu.canvasRootLayoutArray,
        UI_Input,
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
      ),
    },
    gpu: gpu.device,
    label: 'UI.frag',
    pipelineLayouts: [gpu.canvasRootLayoutArray],
  });
}
export type UIFragShaderArray = ReturnType<typeof createUIFragmentShaderArray>;
