import { PipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';
type BindLayouts = [GPU['BindGroupLayoutCanvas']]

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

export function createUIVertShader(pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2<typeof position_uv_attrs>) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(new Struct('Output',
                {
                    Position: [
                        '@builtin(position)',
                        'vec4<f32>'
                    ],
                    v_uv: [
                        '@location(0)',
                        'vec2<f32>'
                    ],
                }),
            pipelineLayout,
            [buffers],
            ([{ uniforms, /*texture*/ }], [{ position, uv, }]) => /* wgsl */
                `
      var output : Output;   
      output.Position = vec4<f32>(${uniforms.prop('translate')} + ${position}, 1.0, 1.0);
      output.v_uv=${uv};
      return output;
    `),
        },
        gpu: pipelineLayout.gpu,
        label: 'UI.vert',

    });
}
export type UIVertShader = ReturnType<typeof createUIVertShader>