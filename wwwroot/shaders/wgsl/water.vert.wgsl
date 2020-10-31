[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};

[[block]] struct Time {
  [[offset(0)]] time : u32;
  [[offset(4)]] delta : f32;
  [[offset(8)]] windDelta : f32;
};

[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};

[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), set(0)]] var<uniform> times : Time;
[[binding(0), set(1)]] var<uniform> lights : Lights;

const pos : array<vec3<f32>, 4> = array<vec3<f32>, 4>(
    vec3<f32>(-50000.0,     3.0,   -50000.0),
    vec3<f32>(50000.0,      3.0,   -50000.0),
    vec3<f32>(-50000.0,     3.0,   50000.0),
    vec3<f32>(50000.0,      3.0,   50000.0)
    
    );

[[builtin(position)]] var<out> Position : vec4<f32>;
[[builtin(vertex_idx)]] var<in> VertexIndex : i32;

[[location(0)]] var<out> shading : f32;
[[location(1)]] var<out> ambient : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = uniforms.modelViewProjectionMatrix * vec4<f32>(pos[VertexIndex], 1.0);
  shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  ambient=lights.ambient;
  return;
}