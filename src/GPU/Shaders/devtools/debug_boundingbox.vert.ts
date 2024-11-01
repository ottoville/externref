import {
  type BufLayout,
  type ShaderStage,
  Struct,
  StructProperty,
  VertexBufferLayouts,
  type VertexShader,
  VertexShaderBuilder,
  VertexShaderFunction,
  WGSLcode,
} from '../../../webgpu-ts/index.js';
import { GPU } from '../../../GPU.js';
import { type Scene, colorPositionOutput } from '../structs/Structs.js';

export const createDebugBoundingBoxVertShader = (
  gpu: GPU,
  buffers: VertexBufferLayouts<
    readonly [
      {
        readonly stepMode: 'vertex';
        readonly struct: Struct<{
          readonly position: StructProperty<'vec3<f32>'>;
        }>;
      },
    ]
  >,
) => {
  const pipelineLayout = gpu.pipelineLayouts.positionAndTimeBindGroup;
  return new VertexShaderBuilder(
    [pipelineLayout],
    'debug_boundingBox.vert',
  ).addFunction(
    'main',
    new VertexShaderFunction(
      colorPositionOutput,
      buffers,
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
  );
};
export type DebugBoundingBoxVertShader = VertexShader<
  ReturnType<typeof createDebugBoundingBoxVertShader>['entryPoints'],
  ReturnType<typeof createDebugBoundingBoxVertShader>['pipelineLayouts']
>;
