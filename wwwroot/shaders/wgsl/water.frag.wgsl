[[location(0)]] var<out> outNormals : vec4<f32>;
[[location(1)]] var<out> outPositions : vec4<f32>;
[[location(2)]] var<out> outDiffuse : vec4<f32>;

[[binding(0), group(2)]] var mySampler: sampler;
[[binding(1), group(2)]] var normalTexture: texture_2d<f32>;
[[binding(2), group(2)]] var positionTexture: texture_2d<f32>;
[[binding(3), group(2)]] var diffuseTexture: texture_2d<f32>;

//[[location(0)]] var<in> shading:f32;
//[[location(1)]] var<in> ambient: vec3<f32>;
[[location(0)]] var<in> v_uv : vec4<f32>;
[[location(1)]] var<in> position : vec3<f32>;
[[location(2)]] var<in> id : u32;

[[stage(fragment)]]
fn main() -> void {
  const uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);

  outNormals=textureSample(normalTexture, mySampler, uv);
  outDiffuse=textureSample(diffuseTexture, mySampler, uv);

  outPositions=vec4<f32>(position.xyz, bitcast<f32>(id));





  return;
}