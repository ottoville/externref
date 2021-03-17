[[location(0)]] var<out> outNormals : vec4<f32>;
[[location(1)]] var<out> outPositions : vec4<f32>;
[[location(2)]] var<out> outDiffuse : vec4<f32>;

[[binding(0), set(2)]] var<uniform_constant> mySampler: sampler;
[[binding(1), set(2)]] var<uniform_constant> normalTexture: texture_2d<f32>;
[[binding(2), set(2)]] var<uniform_constant> positionTexture: texture_2d<f32>;
[[binding(3), set(2)]] var<uniform_constant> diffuseTexture: texture_2d<f32>;

[[location(0)]] var<in> shading:f32;
[[location(1)]] var<in> ambient: vec3<f32>;
[[location(2)]] var<in> v_uv : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  const uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);

  outNormals=textureSample(normalTexture, mySampler, uv);
  outDiffuse=textureSample(diffuseTexture, mySampler, uv);





  return;
}