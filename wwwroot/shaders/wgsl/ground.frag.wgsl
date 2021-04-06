//[[location(0)]] var<out> outColor : vec4<f32>;
[[location(0)]] var<out> outNormals : vec4<f32>;
[[location(1)]] var<out> outPositions : vec4<f32>;
[[location(2)]] var<out> outDiffuse : vec4<f32>;

[[binding(0), group(1)]] var mySampler: sampler;
[[binding(1), group(1)]] var myTexture: texture_2d<f32>;

[[location(0)]] var<in> v_uv : vec2<f32>;
//[[location(1)]] var<in> shading : f32;
//[[location(1)]] var<in> ambient : vec3<f32>;
[[location(1)]] var<in> normal : vec3<f32>;
[[location(2)]] var<in> position : vec3<f32>;
//[[location(4)]] var<in> id : u32;

[[stage(fragment)]]
fn main() -> void {
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  outNormals=vec4<f32>(normal.xyz, 1.0);
  //outPositions=vec4<f32>(position.xyz, bitcast<f32>(id));
  outPositions=vec4<f32>(position.xyz, 1.0);
  outDiffuse = textureSample(myTexture, mySampler, v_uv);
  return;
}