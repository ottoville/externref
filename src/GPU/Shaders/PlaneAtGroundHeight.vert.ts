import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { type Scene, colorPositionOutput } from './structs/Structs.js';
import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';

export function createPlaneAtGroundHeightVertShader(
  pipelineLayout: GPU['shaders']['terrainHeightsbindGroupTreePosition'],
  buffers: VertexBufferLayout2,
  settings: typeof Terrain.settings,
) {
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        colorPositionOutput,
        [buffers],
        ([
          ,
          /*{uniforms,}*/ {
            scene /*time, clusters_array, meshes, projection*/,
          },
          ,
          { world },
        ]) => WGSLcode/* wgsl */ `
            var output:Output;
            var worldPos:vec4<f32> = ${world.prop('transformation')} * position;
            worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 1.0;
            output.position = ${scene.prop('modelViewProjection')} * worldPos;
            output.color = vec3<f32>(1.0,1.0,1.0);
            return output;
        `,
      ) satisfies VertexShaderFunction<
        [
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
    .build(
      'PlaneAtGroundHeight.vert',
      ([
        ,
        ,
        /*{ uniforms, }*/ /*{ scene,time, clusters_array, meshes, projection}*/ /*{ world, }*/ {
          slopes,
          facet12,
        },
      ]) => getHeightAtCoordinates(settings, slopes, facet12),
    );
}
export type PlaneAtGroundHeightVertShader = ReturnType<
  typeof createPlaneAtGroundHeightVertShader
>;
