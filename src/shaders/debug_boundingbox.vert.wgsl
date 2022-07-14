struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};
#import "mesh.export.wgsl"
@binding(0) @group(1) var<uniform> uniforms : Uniforms;
@binding(0) @group(2) var<uniform> worldposition : MeshUniforms;


struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec3<f32>
 };

@vertex
fn main(@location(0) position : vec3<f32>,
  @builtin(vertex_index) gl_VertexIndex : u32 ) -> Output {
    var output : Output;
    var vertexPosition:vec4<f32> = vec4<f32>(position.xyz, 1.0);
    output.Position = uniforms.modelViewProjectionMatrix * vertexPosition;
    output.color = vec3<f32>(0.0,1.0,0.0);
    return output;
  }