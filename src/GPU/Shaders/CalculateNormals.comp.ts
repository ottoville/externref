import { FloatArray, IntArray, PlaneArray } from './structs/Structs.js';
import type { Terrain } from '../../world/Terrain.js';
import { SlopesLayout } from './CreateTerrainTexture.comp.js';
import {
  BGLayout,
  BufLayout,
  ComputeShader,
  ComputeShaderFunction,
  PipelineLayout,
  ShaderStage,
} from '../../webgpu-ts/index.js';

export function createCalculateNormals(
  settings: typeof Terrain.settings,
  slopesLayout: SlopesLayout,
) {
  const facetSize = settings.subdivisions[0] * settings.subdivisions[1];
  const bindLayouts = [
    new BGLayout(slopesLayout.gpu, 'normalsBindGroupLayout', {
      vertices: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 32,
            type: 'storage',
          },
          visibility: ShaderStage.COMPUTE,
        },
        FloatArray,
      ),
    }),
    slopesLayout,
  ] as const;

  const pipelineLayout = new PipelineLayout({
    bindGroupLayouts: bindLayouts,
    label: 'calculateNormalsPipeline',
  });
  return [
    bindLayouts,
    new ComputeShader({
      entryPoints: {
        main: new ComputeShaderFunction<
          [
            {
              vertices: BufLayout<ShaderStage.COMPUTE, typeof FloatArray>;
            },
            {
              slopes: BufLayout<ShaderStage.COMPUTE, typeof IntArray>;
              facet12: BufLayout<ShaderStage.COMPUTE, typeof PlaneArray>;
            },
          ]
        >(
          '@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>',
          [1],
          ([{ vertices }, { /*slopes,*/ facet12 }]) => /* wgsl */ `
            let stride : u32 = 12u;

   let i:u32 = GlobalInvocationID.y * stride;
   let j:u32 = GlobalInvocationID.x * ${settings.subdivisions[0] + 1} * stride;

   let rows:u32 = GlobalInvocationID.x * ${settings.subdivisions[0]};
   let last_y:u32=GlobalInvocationID.y - 1u;
   
   let norm1:vec3<f32> = ${facet12.prop(
     'plane',
   )}[rows +  GlobalInvocationID.y].norm;
   let norm2:vec3<f32> = ${facet12.prop(
     'plane',
   )}[${facetSize} +  (rows +  GlobalInvocationID.y)].norm;
   let norm4:vec3<f32> = ${facet12.prop(
     'plane',
   )}[${facetSize} +  rows +  last_y].norm;
   let last_x:u32 = GlobalInvocationID.x - 1u;
   let norm5:vec3<f32> = ${facet12.prop('plane')}[last_x * ${
     settings.subdivisions[0]
   } +  GlobalInvocationID.y].norm;
   let norm7:vec3<f32> = ${facet12.prop('plane')}[last_x * ${
     settings.subdivisions[0]
   } +  last_y].norm;
   let norm8:vec3<f32> = ${facet12.prop('plane')}[${facetSize} + last_x * ${
     settings.subdivisions[0]
   } +  last_y].norm;

   let normalized:vec3<f32> = normalize(norm1 + norm2 + norm4 + norm5 + norm7 + norm8);

   

   ${vertices.prop('numbers')}[j + i + 4u]=normalized.x;
   ${vertices.prop('numbers')}[j + i + 5u]=normalized.y;
   ${vertices.prop('numbers')}[j + i + 6u]=normalized.z;
            `,
        ),
      },
      gpu: pipelineLayout.gpu,
      label: 'CalculateNormals.comp',
      pipelineLayouts: [pipelineLayout],
    }),
  ] as const;
}
export type CalculateNormals = ReturnType<typeof createCalculateNormals>;
