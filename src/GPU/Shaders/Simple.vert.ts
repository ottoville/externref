import { BindablePipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js'
import type { simpleAttributes } from '../RenderPipeLines/SimpleRenderPipeline.js'
import { VertexShaderFunction } from './ShaderFunction.js';
import { pickOutput, typicalOutput } from './structs/Structs.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts']

/**
  Shader where mesh is single colored
*/
export function createSimpleVertShader(pipelineLayout: BindablePipelineLayout<BindLayouts>, buffers: VertexBufferLayout2<typeof simpleAttributes>) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                typicalOutput,
                pipelineLayout,
                '',
                [buffers], ([
                    [/*uniforms*/,],
                    [scene/*time, clusters_array, meshes, projection*/],
                    [world]
                ], [{ position, normal, }]) => /* wgsl */ `
            var output:Output;
            var curPos : mat4x4<f32> = ${world.prop('transformation')};
            curPos[3].w=1.0;
            var worldPos=curPos * vec4<f32>(${position}, 1.0);
            output.normal = normalize((curPos * vec4<f32>(${normal}, 0.0)).xyz);
          
            output.Position = ${scene.prop('modelViewProjection') } * worldPos;
            output.id=${world.prop('id')};
            output.color = ${world.prop('color')};
            output.position=vec3<f32>(worldPos.xyz);
            output.scenes=${world.prop('scenes')};
            //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
            //ambient=lights.ambient;
            return output;
          `),
            pick: new VertexShaderFunction(pickOutput,
                pipelineLayout,
                '',
                [buffers],
                ([
                    [/*uniforms*/,],
                    [scene/*time, clusters_array, meshes, projection*/],
                    [world]
                ], [{ position, }]) => /* wgsl */ `
              var output: PickOutput;
              var curPos : mat4x4<f32> = ${world.prop('transformation')};
              curPos[3] = ${world.prop('transformation')}[3]; //+ vec4<f32>(mesh_uniforms.delta,1.0) * times.delta;
              curPos[3].w=1.0;
              var worldPos=curPos * vec4<f32>(${position}, 1.0);
            
              output.Position = ${scene.prop('modelViewProjection')} * worldPos;
              output.id=${world.prop('id')};
              //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
              //ambient=lights.ambient;
              return output;
          
            `),
        },
        gpu: pipelineLayout.gpu,
        label: 'Simple.vert',
    })
}
export type SimpleVertShader = ReturnType<typeof createSimpleVertShader>
