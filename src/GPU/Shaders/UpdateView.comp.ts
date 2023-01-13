import { BGLayout, BufLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js'
import { Clusters, Lights, MeshArray, ViewUniforms } from './structs/Structs.js';

    /////////////////
    const wgsl = /* wgsl */ `     
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
        
        @compute @workgroup_size(4, 2, 4)
        fn main(
            @builtin(global_invocation_id) global_id : vec3<u32>
        ) {
        
          let tileIndex = global_id.x +
                          global_id.y * tileCount.x +
                          global_id.z * tileCount.x * tileCount.y;
        
          
          var lightCount=0u;
          for(var pointerIndex:u32=0u; pointerIndex < directional_lights.length; pointerIndex = pointerIndex + 1u) {
            let meshIndex = directional_lights.pointers[pointerIndex];
            let mesh=meshes.mesh[meshIndex];
            clusters.lights[tileIndex*63u + lightCount] = meshIndex;
            lightCount=lightCount+1u;
            if(lightCount==63u) {
              break;
            }
          }
          let cluster=clusters.bounds[tileIndex];
          for(var pointerIndex:u32=0u; pointerIndex < point_lights.length; pointerIndex = pointerIndex + 1u) {
            let meshIndex = point_lights.pointers[pointerIndex];
            let mesh=meshes.mesh[meshIndex];
            // TODO: Preselect lights with CPU
            let lightViewPos = viewUniforms.view * vec4<f32>(mesh.transformation[3].xyz, 1.0);
            let sqDist = sqDistPointAABB(lightViewPos.xyz, cluster.minAABB.xyz, cluster.maxAABB.xyz);
        
            if (sqDist <= mesh.point_light_squared) {
              // Light affects this cluster. Add it to the list.
              clusters.lights[tileIndex*63u + lightCount] = meshIndex;
              lightCount=lightCount+1u;
              //TODO: lightCount might already be max because of directional lights
              if(lightCount==63u) {
                break;
              }
            }
        
          }
          clusters.lightsCount[tileIndex] = lightCount;
        }
        
      `;
    ///////////////////////////

export class UpdateView extends ComputeShader<
  { main: PipelineLayout }> {
    bindLayouts: readonly [
      BGLayout<[BufLayout, BufLayout, BufLayout]>,
      BGLayout<[BufLayout, BufLayout]>]
  constructor(
    gpu: GPU) {
    const bindLayouts = [
      new BGLayout(gpu, 'UpdateViewLayout',
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 512
            }
          }, 'meshes', MeshArray),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 16
            }
          }, 'point_lights', Lights),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 16
            }
          }, 'directional_lights', Lights)
      ),
      new BGLayout(gpu, 'UpdateClustersLayout',
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 7962624
            }
          }, 'clusters', Clusters),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: 'uniform',
              hasDynamicOffset: false,
              minBindingSize: 144
            }
          }, 'viewUniforms', ViewUniforms)
      )
    ] as const;

    const pipelineLayout = new PipelineLayout({
      label: 'UpdateViewPipeline',
      bindGroupLayouts: bindLayouts
    });
    super(pipelineLayout, wgsl, "UpdateView.comp", {
      main: pipelineLayout
    });
    this.bindLayouts = bindLayouts;

  }
}