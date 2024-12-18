import { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import {
  PositionNormalUvVertice,
  colorPositionOutput,
} from './structs/Structs.js';
import {
  VertexShaderFunction,
  WGSLcode,
  VertexShaderBuilder,
  type VertexShader,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import { PlaneVertexFuntion } from './Plane.vert.js';

const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionNormalUvVertice,
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
            output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
            output.color = vec3<f32>(1.0,1.0,1.0);
            return output;
        `,
    ) satisfies PlaneVertexFuntion,
  );
}

export type PlaneAtGroundHeightVertShader = VertexShader<
  ReturnType<typeof createPlaneAtGroundHeightVertShader>['entryPoints'],
  ReturnType<typeof createPlaneAtGroundHeightVertShader>['pipelineLayouts']
>;
