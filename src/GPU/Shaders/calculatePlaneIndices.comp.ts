import { U32Arr } from './structs/Structs.js';
import type { GPU } from '../../GPU.js';
import type { Terrain } from '../../world/Terrain.js';
import {
  BGLayout,
  BufLayout,
  ComputeShader,
  ComputeShaderFunction,
  PipelineLayout,
  ShaderStage,
} from '../../webgpu-ts/index.js';

export function createCalculatePlaneIndices(
  gpu: GPU,
  settings: typeof Terrain.settings,
) {
  const bindLayouts = [
    new BGLayout(gpu.device, 'calculateIndicesBindGroupLayout', {
      indices: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 32,
            type: 'storage',
          },
          visibility: ShaderStage.COMPUTE,
        },
        U32Arr,
      ),
    }),
  ] as const;

  const pipelineLayout = new PipelineLayout({
    bindGroupLayouts: bindLayouts,
    label: 'calculatePlaneIndicesPipeline',
  });
  return [
    bindLayouts,
    new ComputeShader({
      entryPoints: {
        main: new ComputeShaderFunction<
          [
            {
              indices: BufLayout<ShaderStage.COMPUTE, typeof U32Arr>;
            },
          ]
        >(
          '@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>',
          [1],
          ([{ indices }] /* wgsl */) =>
            `
            let idx1: u32 = (GlobalInvocationID.x + u32(1) + (GlobalInvocationID.y + u32(1)) * (${settings.subdivisions[0]} + u32(1)));
            let idx2: u32 = (GlobalInvocationID.x + u32(1) + GlobalInvocationID.y * (${settings.subdivisions[1]} + u32(1)));
            let idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (${settings.subdivisions[0]} + u32(1)));
            let idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + u32(1)) * (${settings.subdivisions[1]} + u32(1)));
            let index:u32 = GlobalInvocationID.y*${settings.subdivisions[0]}*u32(6) + GlobalInvocationID.x*u32(6);
            ${indices.variableName}.numbers[index] = idx1;
            ${indices.variableName}.numbers[index+u32(1)]=idx2;
            ${indices.variableName}.numbers[index+u32(2)]=idx3;
          
            ${indices.variableName}.numbers[index+u32(3)]=idx4;
            ${indices.variableName}.numbers[index+u32(4)]=idx1;
            ${indices.variableName}.numbers[index+u32(5)]=idx3;
    
            `,
        ),
      },
      label: 'calculatePlaneIndices.comp',
      pipelineLayouts: [pipelineLayout],
    }),
  ] as const;
}
export type CalculatePlaneIndices = ReturnType<
  typeof createCalculatePlaneIndices
>;
