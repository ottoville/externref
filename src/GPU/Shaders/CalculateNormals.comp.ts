import { BGLayout, BindGroupLayoutEntry, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';

export class CalculateNormals extends ComputeShader<
  [
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
  ]
  ,
  { main: PipelineLayout }> {
  entryPoints: { main: PipelineLayout; };
  module: GPUShaderModule;
  constructor(
    settingsLayout: BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    slopesLayout: BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>
  ) {
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'normalsBindGroupLayout',
        new BindGroupLayoutEntry(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'normals', 'FloatArray')),
      slopesLayout
    ] as const
    super(settingsLayout.gpu, bindLayouts);


    /////////////////

    const wgsl = /* wgsl */ `

   
   ${this.groups[0]![0]} settings : Settings;
   ${this.groups[1]![0]} normals : FloatArray;
   ${this.groups[2]![0]} slopes : Slopes;
   ${this.groups[2]![1]} facet12 : PlaneArray;
   
   struct FloatArray {
    numbers: array<f32>
 };
  struct Plane {
    norm : vec3<f32>,
    d : f32
 };
 struct PlaneArray {
   plane: array<Plane>
 };
 struct Slopes {
    numbers: array<i32>
 };
 struct Settings {
      size : vec2<u32>,
      bufferSize : vec2<u32>,
      subdivisions : u32,
      heightMinMax : vec2<i32>,
      max : vec2<i32>,
      textureSize:vec2<u32>
 };


   @compute @workgroup_size(1)
   fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
       let stride : u32 = 12u;
       let facetSize : u32 = settings.subdivisions * settings.subdivisions; //250*250* 4;
   
       let i:u32 = GlobalInvocationID.y * stride;
       let j:u32 = GlobalInvocationID.x * (settings.subdivisions + 1u) * stride;
   
       let rows:u32 = GlobalInvocationID.x * settings.subdivisions;
       let last_y:u32=GlobalInvocationID.y - 1u;
       
       let norm1:vec3<f32> = facet12.plane[rows +  GlobalInvocationID.y].norm;
       let norm2:vec3<f32> = facet12.plane[facetSize +  (rows +  GlobalInvocationID.y)].norm;
       let norm4:vec3<f32> = facet12.plane[facetSize +  rows +  last_y].norm;
       let last_x:u32 = GlobalInvocationID.x - 1u;
       let norm5:vec3<f32> = facet12.plane[last_x * settings.subdivisions +  GlobalInvocationID.y].norm;
       let norm7:vec3<f32> = facet12.plane[last_x * settings.subdivisions +  last_y].norm;
       let norm8:vec3<f32> = facet12.plane[facetSize + last_x * settings.subdivisions +  last_y].norm;
   
       let normalized:vec3<f32> = normalize(norm1 + norm2 + norm4 + norm5 + norm7 + norm8);
       
       //1 and 2
       //1 and 3   close   1
       //1 and 4
       //1 and 5
       //1 and 6   close 1
       //1 and 7   close 1
       //1 and 8
       //2 and 3   close 2
       //2 and 4   close 3
       //2 and 5   close 1
       //2 and 6   close 1
       //2 and 7   close 1
       //2 and 8   close 1
       //3 and 4   close 1
       //3 and 5   close 2
       //3 and 6   VERY CLOSE
       //3 and 7   close 1
       //3 and 8   close 1
       //4 and 5   close 3
       //4 and 6   close 1
       //4 and 7   close 1
       //4 and 8   close 1
       //5 and 6   far
       //5 and 7   close 1
       //5 and 8   far
       //6 and 7   far
       //6 and 8   close 1
       //7 and 8   far
       
   
       normals.numbers[j + i + 4u]=normalized.x;
       normals.numbers[j + i + 5u]=normalized.y;
       normals.numbers[j + i + 6u]=normalized.z;
      
       return;
    }
      `;

    /////////////////////////////////

    const pipelineLayout = new PipelineLayout({
      label: 'calculateNormalsPipeline',
      bindGroupLayouts: this.bindLayouts
    });
    this.entryPoints = {
      main: pipelineLayout
    }
    this.module = this.gpu.device.createShaderModule(
      {
        code: wgsl,
        label: 'calculateNormals.comp',
        hints: this.entryPoints
      });
  }
}