struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};
#import "mesh.export.wgsl"

struct Time {
  time : u32,
  delta : f32
};
@binding(0) @group(1) var<uniform> uniforms : Uniforms;
@binding(0) @group(2) var<uniform> mesh_uniforms : MeshUniforms;
@binding(1) @group(1) var<uniform> times : Time;

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
  var curPos : mat4x4<f32> = mesh_uniforms.transformation;
  curPos[3] = mesh_uniforms.transformation[3]; //+ vec4<f32>(mesh_uniforms.delta,1.0) * times.delta;
  curPos[3].w=1.0;
  var worldPos=curPos * vec4<f32>(pos, 1.0);

  output.Position = uniforms.modelViewProjectionMatrix * worldPos;
  output.id=mesh_uniforms.id;
  output.color = mesh_uniforms.color;
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
  var curPos : mat4x4<f32> = mesh_uniforms.transformation;
  curPos[3] = mesh_uniforms.transformation[3]; //+ vec4<f32>(mesh_uniforms.delta,1.0) * times.delta;
  curPos[3].w=1.0;
  var worldPos=curPos * vec4<f32>(pos, 1.0);

  output.Position = uniforms.modelViewProjectionMatrix * worldPos;
  output.id=mesh_uniforms.id;
  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}