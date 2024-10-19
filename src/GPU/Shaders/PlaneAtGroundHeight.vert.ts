import { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import {
  PositionVertice,
  type Scene,
  colorPositionOutput,
} from './structs/Structs.js';
import {
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  type VertexShader,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';

const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionVertice,
  },
]);

export function createPlaneAtGroundHeightVertShader(gpu: GPU) {
  const pipelineLayout = gpu.shaders.terrainHeightsbindGroupTreePosition;

  const settings = Terrain.settings;
  return new VertexShaderBuilder(
    [pipelineLayout],
    'PlaneAtGroundHeight.vert',
    ([
      ,
      ,
      /*{ uniforms, }*/ /*{ scene,time, clusters_array, meshes, projection}*/ /*{ world, }*/ {
        slopes,
        facet12,
      },
    ]) => getHeightAtCoordinates(settings, slopes, facet12),
  ).addFunction(
    'main',
    new VertexShaderFunction(
      colorPositionOutput,
      buffers,
      (
        [
          ,
          /*{uniforms,}*/ {
            scene /*time, clusters_array, meshes, projection*/,
          },
          ,
          { world },
        ],
        [{ position }],
      ) => WGSLcode/* wgsl */ `
            var output:Output;
            var worldPos:vec4<f32> = ${world.prop('transformation')} * ${position};
            worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 1.0;
            output.position = ${scene.prop('modelViewProjection')} * worldPos;
            output.color = vec3<f32>(1.0,1.0,1.0);
            return output;
        `,
    ) satisfies VertexShaderFunction<
      [
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {},
        {
          scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {},
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

export type PlaneAtGroundHeightVertShader = VertexShader<
  ReturnType<typeof createPlaneAtGroundHeightVertShader>['entryPoints'],
  ReturnType<typeof createPlaneAtGroundHeightVertShader>['pipelineLayouts']
>;
