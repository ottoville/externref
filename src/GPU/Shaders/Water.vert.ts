import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import { MeshUniforms, Scene, WaterInput } from './structs/Structs.js';
import { positionAttr } from './structs/Attributes.js';

export function createWaterVertShader(
  pipelineLayout: GPU['bindGroupTextureWater'],
  buffers: VertexBufferLayout2<typeof positionAttr>,
) {
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
            { world },
            /*{mySampler, diffuseTexture}*/
          ],
          [{ position }],
        ) => /* wgsl */ `
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
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              typeof MeshUniforms
            >;
          },
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
        ]
      >,
    )
    .build('water.vert');
}
export type WaterVertShader = ReturnType<typeof createWaterVertShader>;
