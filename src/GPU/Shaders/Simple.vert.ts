import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { BindablePipelineLayout, PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';

type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>]

export class SimpleVertShader extends VertexShader<
  {
    main: PipelineLayout,
    pick: PipelineLayout
  },
  [GPUVertexBufferLayout],
  PipelineLayout<BindLayouts>> {
  constructor(pipelineLayout: BindablePipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {
    super({
      pipelineLayout,
      entryPoints: {
        main: pipelineLayout,
        pick: pipelineLayout
      },
      label: 'Simple.vert'
    }, [buffers]);
    this.createWGSL((
      [/*uniforms*/,],
      [scene, /*time, clusters_array, meshes, projection*/],
      [world]) => {

      //////////////////////////////////

      return /* wgsl */ `

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) normal : vec3<f32>,
  @location(1) @interpolate(flat) id : u32,
  @location(2) color : vec3<f32>
};
@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32,
  @location(0) pos : vec3<f32>,
  @location(1) normal : vec3<f32>
) -> Output {
  var output:Output;
  output.normal=normal;
  var curPos : mat4x4<f32> = ${world.variableName}.transformation;
  curPos[3] = ${world.variableName}.transformation[3]; //+ vec4<f32>(mesh_uniforms.delta,1.0) * times.delta;
  curPos[3].w=1.0;
  var worldPos=curPos * vec4<f32>(pos, 1.0);

  output.Position = ${scene.variableName}.modelViewProjection * worldPos;
  output.id=${world.variableName}.id;
  output.color = ${world.variableName}.color;
  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}
struct PickOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) @interpolate(flat) id : u32
};
@vertex
fn pick(
  @builtin(vertex_index) VertexIndex : u32,
  @location(0) pos : vec3<f32>,
  @location(1) normal : vec3<f32>
) ->PickOutput {
  var output: PickOutput;
  var curPos : mat4x4<f32> = ${world.variableName}.transformation;
  curPos[3] = ${world.variableName}.transformation[3]; //+ vec4<f32>(mesh_uniforms.delta,1.0) * times.delta;
  curPos[3].w=1.0;
  var worldPos=curPos * vec4<f32>(pos, 1.0);

  output.Position = ${scene.variableName}.modelViewProjection * worldPos;
  output.id=${world.variableName}.id;
  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}
  `;
      //////////////
    });
  }
}