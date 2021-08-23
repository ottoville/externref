struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Diffuse : vec4<f32>;
};
//[[location(0)]] var<in> shading:f32;
//[[location(1)]] var<in> ambient: vec3<f32>;

[[stage(fragment)]]
fn main([[location(0)]]  normal : vec3<f32>,[[location(1)]]  id : u32
) -> Output {
  var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+vec4<f32>(1.0,0.0,0.0,1.0) *  vec4<f32>(shading,shading,shading,1.0);
  output.Normals = vec4<f32>(normal,bitcast<f32>(id));
  output.Diffuse = vec4<f32>(1.0,0.0,0.0,1.0);
  return output;
}