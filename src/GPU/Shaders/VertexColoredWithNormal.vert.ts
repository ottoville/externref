import {
  type BufLayout,
  type ShaderStage,
  VertexShader,
  VertexShaderFunction,
  type RenderPipelineLayout,
} from '../../webgpu-ts/index.js';
import { GPU } from '../../GPU.js';
import { MeshUniforms, Scene, typicalOutput } from './structs/Structs.js';
import { createPickOutput } from './SingleColoredWithNormal.vert.js';
import { simpleAttributesWithColor } from './structs/Attributes.js';

/**
  Shader where each vertex carries a color property
*/
export function createVertexColorShader(
  pipelineLayout: RenderPipelineLayout<
    Readonly<GPU['positionAndTimeBindGroup']['bindGroupLayouts']>
  >,
  arrayStride: number,
) {
  const buffers = Object.freeze([
    {
      arrayStride,
      attributes2: simpleAttributesWithColor,
      stepMode: 'vertex',
    },
  ] as const);
  return new VertexShader({
    entryPoints: {
      main: new VertexShaderFunction(
        typicalOutput,
        buffers,
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ color, position, normal }],
        ) => /* wgsl */ `
            var output:Output;
            //output.normal=normal;
            var curPos : mat4x4<f32> = ${world.prop('transformation')};
            var worldPos=curPos * ${position};

            output.normal = normalize((curPos * vec4<f32>(${normal}, 0.0)).xyz);
            output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
            output.id=${world.prop('id')};
            output.position=vec3<f32>(worldPos.xyz);
            output.scenes=${world.prop('scenes')};
            output.color = ${color};

            //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
            //ambient=lights.ambient;
            return output;`,
      ) satisfies VertexShaderFunction<
        [
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
          },
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              typeof MeshUniforms
            >;
          },
        ]
      >,
      pick: createPickOutput(buffers),
    },
    label: 'VertexColor.vert',
    pipelineLayouts: [pipelineLayout],
  });
}
