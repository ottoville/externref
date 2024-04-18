import {
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexBuildin,
  ShaderBuilder,
} from '../../../webgpu-ts/index.js';
import { GPU } from '../../../GPU.js';
import { type Scene, colorPositionOutput } from '../structs/Structs.js';
import { simpleAttributes } from '../structs/Attributes.js';

export function createDebugNormalsVertShader(
  pipelineLayout: GPU['shaders']['positionAndTimeBindGroup'],
  arrayStride: Word<'dword'>,
) {
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        colorPositionOutput,
        [
          {
            arrayStride: arrayStride * 4,
            attributes2: simpleAttributes,
            stepMode: 'vertex',
          },
        ],
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ position, normal }],
        ) => WGSLcode/* wgsl */ `
        var output : Output;
        var vertexPosition:vec4<f32> = ${world.prop(
          'transformation',
        )} * ${position};
        if(${VertexBuildin.vertex_index} % 2u == 1u) {
            var newpos = ${world.prop(
              'transformation',
            )} * (${position} + vec4<f32>(${normal}.xyz, 0.0));
            vertexPosition = vertexPosition + normalize(newpos - vertexPosition)*5;
        }
        output.position = ${scene.prop('modelViewProjection')} * vertexPosition;
        output.color=vec3<f32>(0.0,1.0,0.0);
        return output;
        `,
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
              GPU['meshUniforms']
            >;
          },
        ]
      >,
    )
    .build('debug_normals.vert');
}
