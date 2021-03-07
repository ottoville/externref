[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};
[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};

[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;
[[binding(0), set(1)]] var<uniform> lights : Lights;


[[location(0)]] var<in> position : vec3<f32>;
[[location(1)]] var<in> uv : vec2<f32>;
[[location(2)]] var<in> normal : vec3<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;
[[location(0)]] var<out> v_uv : vec2<f32>;
[[location(1)]] var<out> shading : f32;
[[location(2)]] var<out> ambient : vec3<f32>;
[[location(3)]] var<out> normalOut : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  shading = dot(normal, lights.sunDirection)*lights.shadow;
  ambient=lights.ambient;
  //TODO: precompute
  v_uv=(position.xz + vec2<f32>(5000.0, 5000.0)) * 0.0001; 
  normalOut=normal;
  return;
}