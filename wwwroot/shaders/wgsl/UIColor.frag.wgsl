
//Do not write position, only color.

struct Output {
  [[location(2)]] Diffuse : vec4<f32>;
};
[[stage(fragment)]]
fn main([[location(0)]] color:vec3<f32>) -> Output {
  var output:Output;

  output.Diffuse = vec4<f32>(color.xyz,0.0);

  return output;
}