[[location(0)]] var<out> outNormals : vec4<f32>;
[[location(1)]] var<out> outPositions : vec4<f32>;
[[location(2)]] var<out> outDiffuse : vec4<f32>;

//[[location(0)]] var<in> shading:f32;
//[[location(1)]] var<in> ambient: vec3<f32>;

[[stage(fragment)]]
fn main() -> void {
  //outColor = vec4<f32>(ambient,0.0)+vec4<f32>(1.0,0.0,0.0,1.0) *  vec4<f32>(shading,shading,shading,1.0);
  outNormals = vec4<f32>(1.0,0.0,0.0,1.0);
  outPositions = vec4<f32>(1.0,0.0,0.0,1.0);
  outDiffuse = vec4<f32>(1.0,0.0,0.0,1.0);
  return;
}