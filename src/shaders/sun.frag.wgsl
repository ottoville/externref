struct Output {
  @location(0) Diffuse : vec4<f32>
};

@stage(fragment)
fn main() -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(1.0,1.0,1.0,0.0);//*ambient;
  return output;
}