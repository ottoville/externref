import { BGLayout, BufLayout, SampLayout, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { MeshUniforms } from './structs/MeshUniforms.js';

//////////////////////////////////

const wgsl = /* wgsl */ `
${MeshUniforms}

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) position : vec3<f32>,
  @location(3) @interpolate(flat) id : u32,  
  @location(4) @interpolate(flat) scenes : u32  
 };


@vertex
fn main(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> Output {
  var output : Output;
  output.Position = scene.modelViewProjection * vec4<f32>(position.xyz, 1.0);
  //shading = dot(normal, lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;

  output.v_uv=uv; 
  output.normal=normal;
  output.position=position;

  //let localPosition:vec4<f32> = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //output.position=localPosition.xyz;//position;
  output.id=world.id;
  output.scenes=world.scenes;
  return output;
}
struct PickOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) @interpolate(flat) id : u32
};
@vertex
fn pick(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> PickOutput {
  var output : PickOutput;
  output.Position = scene.modelViewProjection * vec4<f32>(position.xyz, 1.0);
  output.id=world.id;
  return output;
}
  `;
  //////////////
type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>,
  BGLayout<[SampLayout, TextLayout]>]

export class GroundVertShader extends VertexShader<
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
    }, 'Ground.vert');

  }
}