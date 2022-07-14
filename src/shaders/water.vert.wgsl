struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};

struct Time {
  time : u32,
  @align(4) delta : f32
};
#import "mesh.export.wgsl"

@binding(0) @group(1) var<uniform> uniforms : Uniforms;
@binding(1) @group(1) var<uniform> times : Time;
@binding(0) @group(2) var<uniform> worldposition : MeshUniforms;

const pos : array<vec3<f32>, 4> = array<vec3<f32>, 4>(
    vec3<f32>(-50000.0,     3.0,   -50000.0),
    vec3<f32>(50000.0,      3.0,   -50000.0),
    vec3<f32>(-50000.0,     3.0,   50000.0),
    vec3<f32>(50000.0,      3.0,   50000.0)
    );



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