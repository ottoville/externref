import { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { type Scene, colorPositionOutput } from './structs/Structs.js';
import {
  type VertexBufferLayout,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  type VertexShader,
} from '../../webgpu-ts/index.js';
import type { GPU, VertexBufferProps } from '../../GPU.js';

export function createPlaneAtGroundHeightVertShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.shaders.terrainHeightsbindGroupTreePosition;
  const buffers: VertexBufferLayout = {
    arrayStride: vertexBufferProps.stride * 4,
    attributes: Object.freeze({
      position: {
        format: 'float32x3',
        offset: 0,
        shaderFormat: 'vec4<f32>',
        shaderLocation: 0,
      },
    } as const),
    stepMode: 'vertex',
  };
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
      [buffers],
      ([
        ,
        /*{uniforms,}*/ { scene /*time, clusters_array, meshes, projection*/ },
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
