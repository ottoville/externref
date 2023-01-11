import { BGLayout, BufLayout} from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { MeshUniforms } from './structs/MeshUniforms.js';


//////////////////////////////////

const wgsl = /* wgsl */ `
  ${MeshUniforms}

  struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) color : vec3<f32>
  };

  @vertex
  fn main(@location(0) position : vec3<f32>,
    @builtin(vertex_index) gl_VertexIndex : u32 ) -> Output {
      var output : Output;
      var vertexPosition:vec4<f32> = vec4<f32>(position.xyz, 1.0);
      output.Position = scene.modelViewProjection * vertexPosition;
      output.color = vec3<f32>(0.0,1.0,0.0);
      return output;
    }
   `;


//////////////////////////////////

type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>];

export class DebugBoundingBoxVertShader extends VertexShader<
{ main: PipelineLayout },
  [GPUVertexBufferLayout],
  BindLayouts
  > {
  constructor(bindLayouts: BindLayouts, buffers: GPUVertexBufferLayout) {
    const pipelineLayout = new PipelineLayout({
      label: 'debugBoundingBoxPipeline',
      bindGroupLayouts: bindLayouts
    });

    super(bindLayouts[0].gpu, bindLayouts, [buffers], wgsl, {
      main: pipelineLayout
    }, 'debug_boundingBox.vert');

  }
}