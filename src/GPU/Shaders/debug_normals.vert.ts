import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';

 //////////////////////////////////

 const wgsl = /* wgsl */ `

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec3<f32>
 };

@vertex
fn main(@location(0) position : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @builtin(vertex_index) gl_VertexIndex : u32 ) -> Output {
    var output : Output;
    var vertexPosition:vec4<f32> = vec4<f32>(position.xyz, 1.0);
    if(gl_VertexIndex % 2u == 1u) {
        vertexPosition = vertexPosition + vec4<f32>(normal*30.0, 0.0);
    }
    output.Position = scene.modelViewProjection * vertexPosition;
    output.color=vec3<f32>(0.0,1.0,0.0);
    return output;
  }
   `;


 //////////////////////////////////
 
 type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>];
  
export class DebugNormalsVertShader extends VertexShader<
{ main: PipelineLayout },
[GPUVertexBufferLayout],
BindLayouts> {
  constructor(bindLayouts: BindLayouts, buffers: GPUVertexBufferLayout) {
    const pipelineLayout = new PipelineLayout({
      label: 'debugBoundingBoxPipeline',
      bindGroupLayouts: bindLayouts
    });
    const entryPoints = {
      main: pipelineLayout
    }
    super(bindLayouts[0].gpu, bindLayouts, [buffers], wgsl, entryPoints,'debug_normals.vert');
  }
}