import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { type VertexBufferLayout2, VertexShader } from './VertexShader.js';
import type { GPU } from 'GPU.js'
import { Struct } from './structs/Structs.js';
export const positionAttr = Object.freeze(
    {
        position: {
            format: 'float32x3',
            offset: 0,
            shaderFormat: 'vec3<f32>',
            shaderLocation: 0,
        }
    } as const
)
type BindLayouts = GPU['bindGroupTextureWater']['bindGroupLayouts']
export function createWaterVertShader(pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2<typeof positionAttr>) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                new Struct('Output', {
                    Position: ['@builtin(position)', 'vec4<f32>'],
                    v_uv: ['@location(0)', 'vec4<f32>'],
                    // eslint-disable-next-line sort-keys
                    position: ['@location(1)', 'vec3<f32>'],
                    // eslint-disable-next-line sort-keys
                    id: ['@location(2) @interpolate(flat)', 'u32'],
                }),
                pipelineLayout,
                '',
                [buffers],
                ([
                    [/*uniforms*/,],
                    [scene,/*time, clusters_array, meshes, projection*/],
                    [/*world*/,],
                    [/*mySampler, diffuseTexture*/,]
                ], [{ position }]) => /* wgsl */ `
                        var output:Output;
                        output.Position = ${scene.variableName}.modelViewProjection * vec4<f32>(${position}, 1.0);
                        output.v_uv = output.Position;
                        output.position=${position};
                        output.id=world.id;
                    
                        //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
                        //ambient=lights.ambient;
                        return output;
                    `
            )
        },
        gpu: pipelineLayout.gpu,
        label: 'water.vert',
    })
}
export type WaterVertShader = ReturnType<typeof createWaterVertShader>
