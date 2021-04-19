
//Do not write position, only color.


[[location(2)]] var<out> outDiffuse : vec4<f32>;

[[stage(fragment)]]
fn main([[location(0)]] color:vec3<f32>) -> void {

  outDiffuse = vec4<f32>(color.xyz,0.0);

  return;
}