import { PipelineLayout } from '../../PipelineLayout.js';
import { type VertexBufferLayout2, VertexShader } from '../VertexShader.js';
import { GPU } from '../../../GPU.js'
import { VertexShaderFunction } from '../ShaderFunction.js';
import { colorOutput } from '../structs/Structs.js';
type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];

export function createDebugBoundingBoxVertShader(pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(colorOutput,
                pipelineLayout,
                [buffers],
                ([
                    /*{ uniforms, }*/,
                    { scene, /*time, clusters_array, meshes, projection*/ },
                    { world, }
                ]) => /* wgsl */
                    `
                var output : Output;
                var vertexPosition:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(position.xyz, 1.0);
                output.position = ${scene.prop('modelViewProjection')} * vertexPosition;
                output.color = vec3<f32>(0.0,1.0,0.0);
                return output;
            `),
        },
        gpu: pipelineLayout.gpu,
        label: 'debug_boundingBox.vert',
    })
}
export type DebugBoundingBoxVertShader = ReturnType<typeof createDebugBoundingBoxVertShader>;
