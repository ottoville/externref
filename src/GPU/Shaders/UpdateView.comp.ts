import { BGLayout, BufLayout } from '../../webgpu-ts/BindgroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js';
import { Lights, MeshArray, ViewUniforms } from './structs/Structs.js';
import { ComputeShaderFunction } from './ShaderFunction.js';
import { ShaderStage } from 'webgpu-ts/Shader.js';

import { UpdateClustersBufferLayout } from './Clusters.comp.js';
import type { Engine } from 'engine.js';
declare const engine: Engine;

export function createUpdateViewShader(gpu: GPU) {
  const bindLayouts = [
    new BGLayout(gpu.device, 'UpdateViewLayout', {
      directional_lights: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 16,
            type: 'read-only-storage',
          },
          visibility: ShaderStage.COMPUTE,
        },
        Lights,
      ),
      meshes: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 512,
            type: 'read-only-storage',
          },
          visibility: ShaderStage.COMPUTE,
        },

        MeshArray,
      ),
      point_lights: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 16,
            type: 'read-only-storage',
          },
          visibility: ShaderStage.COMPUTE,
        },
        Lights,
      ),
    }),
    new BGLayout(gpu.device, 'UpdateClustersLayout', {
      clusters: UpdateClustersBufferLayout,
      viewUniforms: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 144,
            type: 'uniform',
          },
          visibility: ShaderStage.COMPUTE,
        },
        ViewUniforms,
      ),
    }),
  ] as const;
  const pipelineLayout = new PipelineLayout(
    {
      bindGroupLayouts: bindLayouts,
      label: 'UpdateViewPipeline',
    },
    engine.gpu!,
  );
  return [
    bindLayouts,
    new ComputeShader(
      {
        entryPoints: {
          main: new ComputeShaderFunction(
            '@builtin(global_invocation_id) global_id : vec3<u32>',
            pipelineLayout,
            [4, 2, 4],
            ([
              { meshes, point_lights, directional_lights },
              { clusters, viewUniforms },
            ]) => /* wgsl */ `
                let tileIndex = global_id.x +
                global_id.y * tileCount.x +
                global_id.z * tileCount.x * tileCount.y;


var lightCount=0u;
for(var pointerIndex:u32 = 0u; pointerIndex < ${directional_lights.prop(
              'length',
            )}; pointerIndex = pointerIndex + 1u) {
  let meshIndex = ${directional_lights.prop('pointers')}[pointerIndex];
  let mesh=${meshes.prop('mesh')}[meshIndex];
  ${clusters.prop('lights')}[tileIndex*63u + lightCount] = meshIndex;
  lightCount=lightCount+1u;
  if(lightCount==63u) {
    break;
  }
}
let cluster=${clusters.prop('bounds')}[tileIndex];
for(var pointerIndex:u32 = 0u; pointerIndex < ${point_lights.prop(
              'length',
            )}; pointerIndex = pointerIndex + 1u) {
  let meshIndex = ${point_lights.prop('pointers')}[pointerIndex];
  let mesh=${meshes.prop('mesh')}[meshIndex];
  // TODO: Preselect lights with CPU
  let lightViewPos = ${viewUniforms.prop(
    'view',
  )} * vec4<f32>(mesh.transformation[3].xyz, 1.0);
  let sqDist = sqDistPointAABB(lightViewPos.xyz, cluster.minAABB.xyz, cluster.maxAABB.xyz);

  if (sqDist <= mesh.point_light_squared) {
    // Light affects this cluster. Add it to the list.
    ${clusters.prop('lights')}[tileIndex*63u + lightCount] = meshIndex;
    lightCount=lightCount+1u;
    //TODO: lightCount might already be max because of directional lights
    if(lightCount==63u) {
      break;
    }
  }

}
${clusters.prop('lightsCount')}[tileIndex] = lightCount;
        `,
          ),
        },
        gpu,
        label: 'UpdateView.comp',
      },
      () => /* wgsl */ `
          fn sqDistPointAABB(position : vec3<f32>, minAABB : vec3<f32>, maxAABB : vec3<f32>) -> f32 {
            var sqDist = 0.0;
            // const minAABB : vec3<f32> = clusters.bounds[tileIndex].minAABB;
            // const maxAABB : vec3<f32> = clusters.bounds[tileIndex].maxAABB;
        
            // Wait, does this actually work? Just porting code, but it seems suspect?
            for(var i = 0; i < 3; i = i + 1) {
              let v = position[i];
              if(v < minAABB[i]){
                sqDist = sqDist + (minAABB[i] - v) * (minAABB[i] - v);
              }
              if(v > maxAABB[i]){
                sqDist = sqDist + (v - maxAABB[i]) * (v - maxAABB[i]);
              }
            }
        
            return sqDist;
          }
        const tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);
        `,
    ),
  ] as const;
}
export type UpdateView = ReturnType<typeof createUpdateViewShader>;
