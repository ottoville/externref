import {
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexBuildin,
  ShaderBuilder,
} from '../../../webgpu-ts/index.js';
import { GPU, VertexBufferProps } from '../../../GPU.js';
import { type Scene, colorPositionOutput } from '../structs/Structs.js';
import { simpleAttributes } from '../structs/Attributes.js';

export function createDebugNormalsVertShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.shaders.positionAndTimeBindGroup;
  const arrayStride = vertexBufferProps.stride;
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        colorPositionOutput,
        [
          {
            arrayStride: arrayStride * 4,
            attributes: simpleAttributes,
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
            vertexPosition = vertexPosition + vec4<f32>(normalize(${world.prop('transformation_normals')} * ${normal}.xyz)*5,0.0);
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
