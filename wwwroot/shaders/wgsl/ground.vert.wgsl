[[block]] struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
  view : mat4x4<f32>;
  viewPosition : vec3<f32>;
};
[[block]] struct WorldPosition {
  world : mat4x4<f32>;
  [[size(16)]] delta : vec3<f32>;
  [[size(16)]] custom : vec3<f32>;
  [[size(16)]] acceleration : vec3<f32>;
   id : u32;
};

//[[block]] struct Lights {
//  [[offset(48)]] sunDirection : vec3<f32>;
//  [[offset(80)]] ambient : vec3<f32>;
//  [[offset(92)]] shadow : f32;
//};
[[block]] struct Time {
  time : u32;
  delta : f32;
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> times : Time;


//[[binding(0), set(1)]] var<uniform> lights : Lights;
[[binding(0), group(1)]] var<uniform> worldposition : WorldPosition;

struct Output {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] v_uv : vec2<f32>;
  //[[location(1)]] var<out> shading : f32;
  //[[location(1)]] var<out> ambient : vec3<f32>;
  [[location(1)]] normal : vec3<f32>;
  [[location(2)]] position : vec3<f32>;
  [[location(3)]] id : u32;
  [[location(4)]] viewPosition : vec4<f32>;
  
 };


[[stage(vertex)]]
fn main([[location(0)]] position : vec3<f32>,
        [[location(1)]] uv : vec2<f32>,
        [[location(2)]] normal : vec3<f32> ) -> Output {
  var output : Output;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //shading = dot(normal, lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;

  output.v_uv=uv; 
  output.normal=normal;
  output.position=position;
  output.viewPosition=uniforms.view  * vec4<f32>(position.xyz, 1.0);
  //let localPosition:vec4<f32> = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //output.position=localPosition.xyz;//position;
  output.id=worldposition.id;
  return output;
}
