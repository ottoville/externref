import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  ShaderBuilder,
  WGSLcode,
} from '../../webgpu-ts/index.js';
import type { GPU, VertexBufferProps } from '../../GPU.js';
import { type Scene, WaterInput } from './structs/Structs.js';
import { positionAttr } from './structs/Attributes.js';

export function createWaterVertShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.bindGroupTextureWater;
  const buffers: VertexBufferLayout2<typeof positionAttr> = {
    arrayStride: vertexBufferProps.stride * 4,
    attributes: positionAttr,
    stepMode: 'vertex',
  };
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        WaterInput,
        [buffers],
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            // eslint-disable-next-line no-empty-pattern
            {},
            { world },
          ],
          [{ position }],
        ) => WGSLcode/* wgsl */ `
            var output:Output;
            output.Position = ${
              scene.variableName
            }.modelViewProjection * ${position};
            output.v_uv = output.Position;
            output.position=${position};
            output.id=${world.prop('id')};
        
            //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
            //ambient=lights.ambient;
            return output;
        `,
      ) satisfies VertexShaderFunction<
        readonly [
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
          },
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              GPU['meshUniforms']
            >;
          },
        ]
      >,
    )
    .build('water.vert');
}
export type WaterVertShader = ReturnType<typeof createWaterVertShader>;
