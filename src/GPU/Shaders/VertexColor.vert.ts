import { BindablePipelineLayout } from '../PipelineLayout.js';
import { type VertexBufferLayout2, VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'
import type { simpleAttributesWithColor } from '../RenderPipeLines/ColoredRenderPipeline.js';
import { pickOutput, typicalOutput } from './structs/Structs.js';
import { VertexShaderFunction } from './ShaderFunction.js';

type BindLayouts = Readonly<GPU['positionAndTimeBindGroup']['bindGroupLayouts']>;

/**
  Shader where each vertex carries a color property
*/

export function createVertexColorShader(pipelineLayout: BindablePipelineLayout<BindLayouts>, buffers: VertexBufferLayout2<typeof simpleAttributesWithColor>) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                typicalOutput,
                pipelineLayout,
                '',
                [buffers],
                ([
                    [,],
                    [scene],
                    [world]
                ], [{ color, position, normal, }]) => /* wgsl */ `var output:Output;
      //output.normal=normal;
      var curPos : mat4x4<f32> = ${world.prop('transformation')};
      curPos[3].w=1.0;
      var worldPos=curPos * vec4<f32>(${position}, 1.0);
      output.normal = normalize((curPos * vec4<f32>(${normal}, 0.0)).xyz);
      output.Position = ${scene.prop('modelViewProjection')} * worldPos;
      output.id=${world.prop('id')};
      output.color = ${color};
      output.position=vec3<f32>(worldPos.xyz);
      output.scenes=${world.prop('scenes')};
      //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
      //ambient=lights.ambient;
      return output;` ),
            pick: new VertexShaderFunction(pickOutput,
                pipelineLayout,
                '',
                [buffers],
                ([
                    [,],
                    [scene],
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
        return output;`
            ),
        },
        gpu: pipelineLayout.gpu,
        label: 'VertexColor.vert',
    });


}
