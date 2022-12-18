import { BindGroupLayout2, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout2.js';
import { PipelineLayout2 } from '../PipelineLayout2.js';
import { ComputeShader } from './ComputeShader.js';

export class CalculatePlaneIndices extends ComputeShader<{ main: PipelineLayout2 }> {
  entryPoints: { main: PipelineLayout2; };
  module: GPUShaderModule;
  bindLayouts: [BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>,BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>]
  constructor(settingsLayout: BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>) {
    super(settingsLayout.gpu)
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
      @binding(0) @group(0) var<uniform> settings : Settings;
      @binding(0) @group(1) var<storage, read_write> indices : Indices;
      
      
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
    this.bindLayouts = [
      settingsLayout,
      new BindGroupLayout2(this.gpu, 'calculateIndicesBindGroupLayout',
      {
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
          hasDynamicOffset: false,
          minBindingSize: 32
        }
      })
    ]
    const pipelineLayout = new PipelineLayout2({
      label: 'calculatePlaneIndicesPipeline',
      bindGroupLayouts: this.bindLayouts
    });
    this.entryPoints = {
      main: pipelineLayout
    }
    this.module = this.gpu.device.createShaderModule(
      {
        code: wgsl,
        label: 'calculatePlaneIndices.comp',
        hints: this.entryPoints
      });
  }
}