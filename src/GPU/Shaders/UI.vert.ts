import {
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  PositionUvVertice,
  type float2f32,
  UI_Input,
} from './structs/Structs.js';

const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionUvVertice,
  },
]);

export function createUIVertShader(pipelineLayout: GPU['canvasRootLayout']) {
  return new VertexShaderBuilder([pipelineLayout] as const, 'UI.vert')
    .addFunction(
      'main',
      new VertexShaderFunction(
        UI_Input,
        buffers,
        ([{ uniforms /*texture*/ }], [{ position, uv }]) =>
          WGSLcode/* wgsl */ `
            var output : Output;   
            output.Position = vec4<f32>(${uniforms.prop('numbers')} + ${position}, 1.0, 1.0);
            output.v_uv=${uv};
            return output;
`,
      ) satisfies VertexShaderFunction<
        [
          {
            uniforms: BufLayout<ShaderStage.VERTEX, typeof float2f32>;
          },
        ]
      >,
    )
    .build();
}
export type UIVertShader = ReturnType<typeof createUIVertShader>;
