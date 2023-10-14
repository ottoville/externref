import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import { UIUniforms, UI_Input } from './structs/Structs.js';

export const position_uv_attrs = Object.freeze({
  position: {
    format: 'float32x2',
    offset: 0,
    shaderFormat: 'vec2<f32>',
    shaderLocation: 0,
  },
  uv: {
    format: 'float32x2',
    offset: 8,
    shaderFormat: 'vec2<f32>',
    shaderLocation: 1,
  },
} as const);

export function createUIVertShader(
  pipelineLayout: GPU['canvasRootLayout'],
  buffers: VertexBufferLayout2<typeof position_uv_attrs>,
) {
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        UI_Input,
        [buffers],
        ([{ uniforms /*texture*/ }], [{ position, uv }]) =>
          WGSLcode/* wgsl */ `
            var output : Output;   
            output.Position = vec4<f32>(${uniforms.prop(
              'translate',
            )} + ${position}, 1.0, 1.0);
            output.v_uv=${uv};
            return output;
`,
      ) satisfies VertexShaderFunction<
        [
          {
            uniforms: BufLayout<ShaderStage.VERTEX, typeof UIUniforms>;
          },
        ]
      >,
    )
    .build('UI.vert');
}
export type UIVertShader = ReturnType<typeof createUIVertShader>;
