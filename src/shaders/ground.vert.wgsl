struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
  view : mat4x4<f32>;
  viewPosition : vec3<f32>;
};
struct WorldPosition {
  world : mat4x4<f32>;
  @size(16) delta : vec3<f32>;
  @size(16) custom : vec3<f32>;
  @size(16) acceleration : vec3<f32>;
   id : u32;
   point_light_squared:f32;          //30
   directional_light:f32;
   scenes:u32; //bitmask
};
@binding(0) @group(1) var<uniform> uniforms : Uniforms;
@binding(0) @group(2) var<uniform> worldposition : WorldPosition;

struct Output {
  @builtin(position) Position : vec4<f32>;
  @location(0) v_uv : vec2<f32>;
  @location(1) normal : vec3<f32>;
  @location(2) position : vec3<f32>;
  @location(3) @interpolate(flat) id : u32;  
  @location(4) @interpolate(flat) scenes : u32;  
 };


@stage(vertex)
fn main(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> Output {
  var output : Output;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //shading = dot(normal, lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;

  output.v_uv=uv; 
  output.normal=normal;
  output.position=position;

  //let localPosition:vec4<f32> = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //output.position=localPosition.xyz;//position;
  output.id=worldposition.id;
  output.scenes=worldposition.scenes;
  return output;
}
struct PickOutput {
  @builtin(position) Position : vec4<f32>;
  @location(0) @interpolate(flat) id : u32;
};
@stage(vertex)
fn pick(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> PickOutput {
  var output : PickOutput;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  output.id=worldposition.id;
  return output;
}