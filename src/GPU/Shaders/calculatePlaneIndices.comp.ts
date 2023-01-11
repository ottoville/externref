import { BGLayout, BindGroupLayoutEntry, BufLayout, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
const wgsl = /* wgsl */ `
struct Indices {
  numbers: array<u32>
};
struct Settings {
    size : vec2<u32>,            //8
    bufferSize : vec2<u32>,      //8
    subdivisions : u32,          //4, size = 8 because align of nect item
    heightMinMax : vec2<i32>,    //8, align 4
    max : vec2<i32>,  //8
    textureSize: vec2<u32>       //8
};

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
export class CalculatePlaneIndices extends ComputeShader<
  [BGLayout<[BufLayout]>,
    BGLayout<[BufLayout]>],
  { main: PipelineLayout }> {
  constructor(settingsLayout: BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>) {
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'calculateIndicesBindGroupLayout',
        new BindGroupLayoutEntry(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'indices', 'Indices'))
    ] as const

    const pipelineLayout = new PipelineLayout({
      label: 'calculatePlaneIndicesPipeline',
      bindGroupLayouts: bindLayouts
    });
    super(settingsLayout.gpu, bindLayouts, wgsl, "calculatePlaneIndices.comp", {
      main: pipelineLayout
    })

  }
}