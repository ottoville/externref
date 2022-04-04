struct Output {
  @location(0) Diffuse : vec4<f32>
};

@stage(fragment)
fn main(@location(0) color:vec3<f32>) -> Output {
  var output:Output;
  //outColor = vec4<f32>(color,1.0);

  output.Diffuse = vec4<f32>(color,1.0);

  return output;
}