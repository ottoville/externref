import { PipelineLayout } from '../../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from '../VertexShader.js';
import { GPU } from '../../../GPU.js';
import { VertexShaderFunction } from '../ShaderFunction.js';
import { colorOutput } from '../structs/Structs.js';
import { simpleAttributes } from '../../RenderPipeLines/SimpleRenderPipeline.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];

export function createDebugNormalsVertShader(pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2<typeof simpleAttributes>) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction<BindLayouts, [VertexBufferLayout2<typeof simpleAttributes>]>(
                colorOutput,
                pipelineLayout,
                [buffers],
                ([
                    /*{ uniforms, }*/,
                    { scene, /*time, clusters_array, meshes, projection*/ },
                    { world, }
                ], [{ position, normal, }]) => /* wgsl */
                    `
            var output : Output;
            var vertexPosition:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(${position}.xyz, 1.0);
            if(gl_VertexIndex % 2u == 1u) {
                /*
                    Drop translation part from matrix
                */
                var matt: mat3x3<f32> = mat3x3<f32>(
                    ${world.prop('transformation')}[0].xyz,
                    ${world.prop('transformation')}[1].xyz,
                    ${world.prop('transformation')}[2].xyz
                );
                var transformed_normal = normalize(matt * ${normal});
                vertexPosition = vertexPosition + vec4<f32>(transformed_normal*10.0, 0.0);
            }
            output.position = ${scene.prop('modelViewProjection')} * vertexPosition;
            output.color=vec3<f32>(0.0,1.0,0.0);
            return output;
            `,
                '@builtin(vertex_index) gl_VertexIndex : u32,'),
        },
        gpu: pipelineLayout.gpu,
        label: 'debug_normals.vert',
    });
}
export type DebugNormalsVertShader = ReturnType<typeof createDebugNormalsVertShader>
