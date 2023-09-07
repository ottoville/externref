import type { RenderPipelineLayout } from '../PipelineLayout.js';
import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { MeshUniforms, Scene, colorPositionOutput } from './structs/Structs.js';
import {
  type VertexBufferLayout2,
  VertexShader,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
} from '../../webgpu-ts/index.js';

type BindGroupLayouts =
  Terrain['TerrainHeightsbindGroupTree']['bindGroupLayouts'];

export function createPlaneAtGroundHeightVertShader(
  pipelineLayout: RenderPipelineLayout<BindGroupLayouts>,
  buffers: VertexBufferLayout2,
  settings: typeof Terrain.settings,
) {
  return new VertexShader(
    {
      entryPoints: {
        main: new VertexShaderFunction(
          colorPositionOutput,
          [buffers],
          ([
            ,
            /*{uniforms,}*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
            /*{ _slopes, _facet12, }*/
          ]) => /* wgsl */ `
                var output:Output;
                var worldPos:vec4<f32> = ${world.prop(
                  'transformation',
                )} * position;
                worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 1.0;
                output.position = ${scene.prop(
                  'modelViewProjection',
                )} * worldPos;
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
            {
              world: BufLayout<
                ShaderStage.VERTEX_AND_FRAGMENT,
                typeof MeshUniforms
              >;
            },
          ]
        >,
      },
      label: 'PlaneAtGroundHeight.vert',
      pipelineLayouts: [pipelineLayout],
    },
    ([
      ,
      ,
      ,
      /*{ uniforms, }*/ /*{ scene,time, clusters_array, meshes, projection}*/ /*{ world, }*/ {
        slopes,
        facet12,
      },
    ]) =>
      `
        ${getHeightAtCoordinates(settings, slopes, facet12)}
    `,
  );
}
export type PlaneAtGroundHeightVertShader = ReturnType<
  typeof createPlaneAtGroundHeightVertShader
>;
