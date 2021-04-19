struct Output {
  [[location(0)]] Color : vec4<f32>;
};
//[[location(0)]] var<in> ambient : vec4<f32>;

[[stage(fragment)]]
fn main() -> Output {
  var output:Output;
  output.Color = vec4<f32>(1.0,1.0,1.0,1.0);//*ambient;
  return output;
}