import {
  type BufLayout,
  type ShaderStage,
  VertexBufferLayouts,
  VertexShaderBuilder,
  VertexShaderFunction,
  WGSLcode,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  PositionNormalColorVertice,
  type Scene,
  typicalOutput,
} from './structs/Structs.js';
import { createPickOutput } from './SingleColoredWithNormal.vert.js';

/**
  Shader where each vertex carries a color property
*/
const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionNormalColorVertice,
  },
]);
export function createVertexColorShader(gpu: GPU) {
  const pipelineLayout = gpu.shaders.positionAndTimeBindGroup;

  return new VertexShaderBuilder([pipelineLayout] as const, 'VertexColor.vert')
    .addFunction(
      'main',
      new VertexShaderFunction(
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
        ) => WGSLcode/* wgsl */ `
        var output:Output;
        //output.normal=normal;
        var worldPos=${world.prop('transformation')} * ${position};

        output.normal = normalize((${world.prop(
          'transformation_normals',
        )} * ${normal}));
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
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {},
          {
            scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
          },
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              GPU['meshUniforms']
            >;
          },
        ]
      >,
    )
    .addFunction('pick', createPickOutput(buffers));
}
