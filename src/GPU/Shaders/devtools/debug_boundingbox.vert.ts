import {
  type BufLayout,
  type ShaderStage,
  type VertexShader,
  VertexShaderBuilder,
  VertexShaderFunction,
  WGSLcode,
} from '../../../webgpu-ts/index.js';
import { GPU, VertexBufferProps } from '../../../GPU.js';
import { type Scene, colorPositionOutput } from '../structs/Structs.js';
import { positionAttr } from '../structs/Attributes.js';

export function createDebugBoundingBoxVertShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.shaders.positionAndTimeBindGroup;
  const arrayStride = vertexBufferProps.stride;
  return new VertexShaderBuilder(
    [pipelineLayout],
    'debug_boundingBox.vert',
  ).addFunction(
    'main',
    new VertexShaderFunction(
      colorPositionOutput,
      [
        {
          arrayStride: arrayStride * 4,
          attributes: positionAttr,
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
        [{ position }],
      ) => WGSLcode/* wgsl */ `
            var output : Output;
            var vertexPosition:vec4<f32> = ${world.prop(
              'transformation',
            )} * ${position};
            output.position = ${scene.prop(
              'modelViewProjection',
            )} * vertexPosition;
            output.color = vec3<f32>(0.0,1.0,0.0);
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
  );
}
export type DebugBoundingBoxVertShader = VertexShader<
  ReturnType<typeof createDebugBoundingBoxVertShader>['entryPoints'],
  ReturnType<typeof createDebugBoundingBoxVertShader>['pipelineLayouts']
>;
