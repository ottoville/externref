[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};
[[block]] struct WorldPosition {
  [[offset(0)]] world : mat4x4<f32>;
  [[offset(64)]] delta : vec3<f32>;
};
[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};

[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;
[[binding(0), set(1)]] var<uniform> lights : Lights;
[[binding(0), set(2)]] var<uniform> worldposition : WorldPosition;


[[builtin(position)]] var<out> Position : vec4<f32>;

[[builtin(vertex_idx)]] var<in> VertexIndex : i32;

[[location(0)]] var<in> pos : vec3<f32>;
[[location(0)]] var<out> shading : f32;
[[location(1)]] var<out> ambient : vec3<f32>;


[[stage(vertex)]]
fn main() -> void {
  Position = uniforms.modelViewProjectionMatrix * worldposition.world * vec4<f32>(pos, 1.0);
  shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  ambient=lights.ambient;
  return;
}