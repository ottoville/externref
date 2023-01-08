import { BindGroupLayout, BindGroupLayoutEntry, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { MeshUniforms } from './structs/MeshUniforms.js';
import type { GPU } from '../../GPU.js'

//////////////////////////////////

const wgsl = /* wgsl */ `
struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};

struct Time {
  time : u32,
  @align(4) delta : f32
};
${MeshUniforms}

//[[location(1)]] var<out> ambient : vec3<f32>;
struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec4<f32>,
  @location(1) position : vec3<f32>,
  @location(2) @interpolate(flat) id : u32
};

@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
  var output:Output;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position, 1.0);
  output.v_uv = output.Position;
  output.position=position;
  output.id=worldposition.id;

  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}
  `;
  //////////////


export class WaterVertShader extends VertexShader<
{ main: PipelineLayout },
[GPUVertexBufferLayout],
  [
    BindGroupLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    BindGroupLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
  ]> {
  constructor(gpu: GPU, buffers: GPUVertexBufferLayout) {


    const bindLayouts = [
      new BindGroupLayout(gpu, 'normalsBindGroupLayout',
        new BindGroupLayoutEntry({
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: 32
          }
        }, 'uniforms', 'Uniforms'),
        new BindGroupLayoutEntry(
          {
            visibility: GPUShaderStage.VERTEX,
            buffer: {
              type: "uniform",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'times', 'Time')
      ),
      new BindGroupLayout(gpu, 'normalsBindGroupLayout',
        new BindGroupLayoutEntry(
          {
            visibility: GPUShaderStage.VERTEX,
            buffer: {
              type: "uniform",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'worldposition', 'MeshUniforms'))    ] as const;

  const pipelineLayout = new PipelineLayout({
    label: 'calculateNormalsPipeline',
    bindGroupLayouts: bindLayouts
  });

    super(gpu, bindLayouts, [buffers], wgsl, {
      main: pipelineLayout
    }, 'water.vert', 1);

  }
}