[[location(0)]] var<in> position:vec2<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[binding(0), set(0)]] var<uniform_constant> mySampler: sampler;
[[binding(1), set(0)]] var<uniform_constant> myTexture: texture_2d<f32>;


[[stage(fragment)]]
fn main() -> void {
  //outColor = textureSample(myTexture, mySampler, position.xy);
  outColor = vec4<f32>(1.0,0.0,0.0,1.0);
  return;
}