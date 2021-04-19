//[[location(0)]] var<out> outColor : vec4<f32>;


struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Positions : vec4<f32>;
  [[location(2)]] Diffuse : vec4<f32>;
};

[[stage(fragment)]]
fn main([[location(0)]] color:vec3<f32>) -> Output {
  var output:Output;
  //outColor = vec4<f32>(color,1.0);

  output.Normals = vec4<f32>(1.0,0.0,0.0,1.0);
  output.Positions = vec4<f32>(1.0,0.0,0.0,1.0);
  output.Diffuse = vec4<f32>(1.0,0.0,0.0,1.0);

  return output;
}