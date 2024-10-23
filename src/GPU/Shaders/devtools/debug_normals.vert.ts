import {
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexBuildin,
  VertexShaderBuilder,
  VertexBufferLayouts,
  RenderPipelineLayout,
  Struct,
  StructProperty,
  BGLayout,
} from '../../../webgpu-ts/index.js';
import type { GPU } from '../../../GPU.js';
import { type Scene, colorPositionOutput } from '../structs/Structs.js';

type vertices_array = {
  vertices: BufLayout<
    ShaderStage.VERTEX,
    Struct<
      {
        readonly values: StructProperty<`array<${string}>`>;
      },
      `${string}_arr`
    >
  >;
};

export const createDebugNormalsVertShader = (
  bindGroup: RenderPipelineLayout<
    [
      ...GPU['shaders']['positionAndTimeBindGroup']['bindGroupLayouts'],
      BGLayout<vertices_array>,
    ]
  >,
) =>
  function () {
    return new VertexShaderBuilder(
      [bindGroup],
      'debug_normals.vert',
    ).addFunction(
      'main',
      new VertexShaderFunction(
        colorPositionOutput,
        new VertexBufferLayouts([]),
        ([
          ,
          /*{ uniforms, }*/ {
            scene /*time, clusters_array, meshes, projection*/,
          },
          { world },
          { vertices },
        ]) => WGSLcode/* wgsl */ `
        var real_idx = f32(${VertexBuildin.vertex_index}) / 2.0;
        var vertice = ${vertices.prop('values')}[u32(floor(real_idx))];

        var output : Output;
        var vertexPosition:vec4<f32> = ${world.prop(
          'transformation',
        )} * vec4<f32>(vertice.position.xyz, 1.0);
        if(${VertexBuildin.vertex_index} % 2u == 1u) {
            vertexPosition = vertexPosition + vec4<f32>(normalize(${world.prop('transformation_normals')} *   vertice.normal)*5,0.0);
        }
        output.position = ${scene.prop('modelViewProjection')} * vertexPosition;
        output.color=vec3<f32>(0.0,1.0,0.0);
        return output;
        `,
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
          vertices_array,
        ]
      >,
    );
  };
