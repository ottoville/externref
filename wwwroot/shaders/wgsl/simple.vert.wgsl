[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};
[[block]] struct WorldPosition {
  world : mat4x4<f32>;
  [[size(16)]] delta : vec3<f32>;
  [[size(16)]] custom : vec3<f32>;
  [[size(16)]] acceleration : vec3<f32>;
   id : u32;
};
[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};
[[block]] struct Time {
  [[offset(0)]] time : u32;
  [[offset(4)]] delta : f32;
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
//[[binding(0), group(1)]] var<uniform> lights : Lights;
[[binding(0), group(1)]] var<uniform> worldposition : WorldPosition;
[[binding(1), group(0)]] var<uniform> times : Time;





//[[location(0)]] var<out> shading : f32;
//[[location(1)]] var<out> ambient : vec3<f32>;

struct Output {
  [[builtin(position)]] Position : vec4<f32>;
};
[[stage(vertex)]]
fn main(
  [[builtin(vertex_idx)]] VertexIndex : i32,
  [[location(0)]] pos : vec3<f32>
) -> Output {
  var output:Output;
  var curPos : mat4x4<f32> = worldposition.world;
  curPos[3] = worldposition.world[3] + vec4<f32>(worldposition.delta,1.0) * times.delta;
  curPos[3].w=1.0;
  output.Position = uniforms.modelViewProjectionMatrix * curPos * vec4<f32>(pos, 1.0);

  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}