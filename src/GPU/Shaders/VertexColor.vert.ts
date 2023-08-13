import { BindablePipelineLayout } from '../PipelineLayout.js';
import { type VertexBufferLayout2, VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js';
import type { simpleAttributesWithColor } from '../RenderPipeLines/ColoredRenderPipeline.js';
import { typicalOutput } from './structs/Structs.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { createPickOutput } from './Simple.vert.js';

type BindLayouts = Readonly<
  GPU['positionAndTimeBindGroup']['bindGroupLayouts']
>;

/**
  Shader where each vertex carries a color property
*/
export function createVertexColorShader(
  pipelineLayout: BindablePipelineLayout<BindLayouts>,
  buffers: VertexBufferLayout2<typeof simpleAttributesWithColor>,
) {
  return new VertexShader({
    entryPoints: {
      main: new VertexShaderFunction(
        typicalOutput,
        pipelineLayout,
        [buffers],
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ color, position, normal }],
        ) => /* wgsl */ `var output:Output;
      //output.normal=normal;
      var curPos : mat4x4<f32> = ${world.prop('transformation')};
      var worldPos=curPos * ${position};
      output.normal = normalize((curPos * vec4<f32>(${normal}, 0.0)).xyz);
      output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
      output.id=${world.prop('id')};
      output.color = ${color};
      output.position=vec3<f32>(worldPos.xyz);
      output.scenes=${world.prop('scenes')};
      //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
      //ambient=lights.ambient;
      return output;`,
      ),
      pick: createPickOutput(pipelineLayout, buffers),
    },
    gpu: pipelineLayout.gpu,
    label: 'VertexColor.vert',
  });
}
