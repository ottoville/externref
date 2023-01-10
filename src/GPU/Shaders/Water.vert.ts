import { BGLayout, BufLayout, SampLayout, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { MeshUniforms } from './structs/MeshUniforms.js';

//////////////////////////////////

const wgsl = /* wgsl */ `
struct Scene {
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
  output.Position = scene.modelViewProjectionMatrix * vec4<f32>(position, 1.0);
  output.v_uv = output.Position;
  output.position=position;
  output.id=world.id;

  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}
  `;
  //////////////
type BindLayouts = [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>,
  BGLayout<[SampLayout, TextLayout]>];

export class WaterVertShader extends VertexShader<
{ main: PipelineLayout },
[GPUVertexBufferLayout],
BindLayouts> {
  constructor(bindLayouts: BindLayouts, buffers: GPUVertexBufferLayout) {

  const pipelineLayout = new PipelineLayout({
    label: 'calculateNormalsPipeline',
    bindGroupLayouts: bindLayouts
  });

    super(bindLayouts[0].gpu, bindLayouts, [buffers], wgsl, {
      main: pipelineLayout
    }, 'water.vert');

  }
}