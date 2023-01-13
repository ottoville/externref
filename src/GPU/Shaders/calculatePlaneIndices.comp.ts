import { BGLayout, BindGroupLayoutEntry, BufLayout, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { Indices } from './structs/Structs.js';
const wgsl = /* wgsl */ `

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  let idx1: u32 = (GlobalInvocationID.x + u32(1) + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  let idx2: u32 = (GlobalInvocationID.x + u32(1) + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  let idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  let idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  let index:u32 = GlobalInvocationID.y*settings.subdivisions*u32(6) + GlobalInvocationID.x*u32(6);
  indices.numbers[index] = idx1;
  indices.numbers[index+u32(1)]=idx2;
  indices.numbers[index+u32(2)]=idx3;

  indices.numbers[index+u32(3)]=idx4;
  indices.numbers[index+u32(4)]=idx1;
  indices.numbers[index+u32(5)]=idx3;
  return;
}
`;
export class CalculatePlaneIndices extends ComputeShader<{ main: PipelineLayout }> {
    bindLayouts: readonly [BGLayout<[BufLayout]>,
    BGLayout<[BufLayout]>];
  constructor(settingsLayout: BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>) {
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'calculateIndicesBindGroupLayout',
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'indices', Indices))
    ] as const

    const pipelineLayout = new PipelineLayout({
      label: 'calculatePlaneIndicesPipeline',
      bindGroupLayouts: bindLayouts
    });
    super(pipelineLayout, wgsl, "calculatePlaneIndices.comp", {
      main: pipelineLayout
    })
    this.bindLayouts = bindLayouts;
  }
}