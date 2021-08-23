struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Diffuse : vec4<f32>;
};
//[[location(0)]] var<in> ambient : vec4<f32>;

[[stage(fragment)]]
fn main() -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(1.0,1.0,1.0,0.0);//*ambient;
  return output;
}