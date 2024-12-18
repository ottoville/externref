import {
  VertexShaderFunction,
  WGSLcode,
  VertexShaderBuilder,
  type VertexShader,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import { PositionVertice, WaterInput } from './structs/Structs.js';
import { PlaneVertexFuntion } from './Plane.vert.js';
const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionVertice,
  },
]);
export function createWaterVertShader(gpu: GPU) {
  return new VertexShaderBuilder(
    [gpu.bindGroupTextureWater],
    'water.vert',
  ).addFunction(
    'main',
    new VertexShaderFunction(
      WaterInput,
      buffers,
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
            output.fragCoord = ${scene.prop('modelViewProjection')} * ${position};
            output.v_uv = output.fragCoord;
            output.position=${position};
            output.id=${world.prop('id')};
        
            //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
            //ambient=lights.ambient;
            return output;
        `,
    ) satisfies PlaneVertexFuntion,
  );
}
export type WaterVertShader = VertexShader<
  ReturnType<typeof createWaterVertShader>['entryPoints'],
  ReturnType<typeof createWaterVertShader>['pipelineLayouts']
>;
