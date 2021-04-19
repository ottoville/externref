//[[location(0)]] var<out> outColor : vec4<f32>;



[[location(0)]] var<out> outNormals : vec4<f32>;
[[location(1)]] var<out> outPositions : vec4<f32>;
[[location(2)]] var<out> outDiffuse : vec4<f32>;


[[stage(fragment)]]
fn main([[location(0)]] color:vec3<f32>) -> void {
  //outColor = vec4<f32>(color,1.0);

  outNormals = vec4<f32>(1.0,0.0,0.0,1.0);
  outPositions = vec4<f32>(1.0,0.0,0.0,1.0);
  outDiffuse = vec4<f32>(1.0,0.0,0.0,1.0);

  return;
}