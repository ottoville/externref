[[block]] struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
  view : mat4x4<f32>;
  viewPosition : vec3<f32>;
};

[[block]] struct Time {
  time : u32;
  [[align(4)]] delta : f32;
};
[[block]] struct WorldPosition {
  world : mat4x4<f32>;
  delta : vec3<f32>;
  custom : vec3<f32>;
  acceleration : vec3<f32>;
  id : u32;
};
[[block]] struct Lights {
  sunDirection : vec3<f32>;
  ambient : vec3<f32>;
  shadow : f32;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> times : Time;
[[binding(0), group(1)]] var<uniform> worldposition : WorldPosition;

//[[binding(0), set(1)]] var<uniform> lights : Lights;

let pos : array<vec3<f32>, 4> = array<vec3<f32>, 4>(
    vec3<f32>(-50000.0,     3.0,   -50000.0),
    vec3<f32>(50000.0,      3.0,   -50000.0),
    vec3<f32>(-50000.0,     3.0,   50000.0),
    vec3<f32>(50000.0,      3.0,   50000.0)
    );



//[[location(0)]] var<out> shading : f32;
//[[location(1)]] var<out> ambient : vec3<f32>;
struct Output {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] v_uv : vec4<f32>;
  [[location(1)]] position : vec3<f32>;
  [[location(2)]] id : u32;
};

[[stage(vertex)]]
fn main([[builtin(vertex_idx)]] VertexIndex : i32) -> Output {
  var output:Output;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(pos[VertexIndex], 1.0);
  output.v_uv = output.Position;
  output.position=pos[VertexIndex];
  output.id=worldposition.id;

  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}