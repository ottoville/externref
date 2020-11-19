[[location(0)]] var<out> outColor : vec4<f32>;

[[location(0)]] var<in> color:vec3<f32>;

[[stage(fragment)]]
fn main() -> void {
  outColor = vec4<f32>(color,1.0);
  return;
}