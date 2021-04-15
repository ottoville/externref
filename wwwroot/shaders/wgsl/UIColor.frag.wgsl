
//Do not write position, only color.

[[location(0)]] var<in> color:vec3<f32>;

[[location(2)]] var<out> outDiffuse : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {

  outDiffuse = vec4<f32>(color.xyz,0.0);

  return;
}