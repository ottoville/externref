//[[location(0)]] var<out> outColor : vec4<f32>;
struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Positions : vec4<f32>;
  [[location(2)]] Diffuse : vec4<f32>;
};
[[binding(0), group(2)]] var mySampler: sampler;
[[binding(1), group(2)]] var myTexture: texture_2d<f32>;

[[stage(fragment)]]
fn main(
  [[builtin(position)]] fragCoord : vec4<f32>,
  [[location(0)]]  v_uv : vec2<f32>,
  [[location(1)]] normal : vec3<f32>,
  [[location(2)]]  position : vec3<f32>,
  [[location(3)]]  id : u32) -> Output {
    var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  output.Normals=vec4<f32>(normal.xyz, fragCoord.z);

  output.Positions=vec4<f32>(position, bitcast<f32>(id));

  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(myTexture, mySampler, v_uv);
  //output.Diffuse.w=0.0;
  return output;
}

[[stage(fragment)]]
fn normals(
  [[builtin(position)]] fragCoord : vec4<f32>,
  [[location(0)]]  v_uv : vec2<f32>,
  [[location(1)]] normal : vec3<f32>,
  [[location(2)]]  position : vec3<f32>,
  [[location(3)]]  id : u32) -> Output {
    var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  output.Normals=vec4<f32>(normal.xyz, 1.0);

  output.Positions=vec4<f32>(position.xyz, bitcast<f32>(id));

  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(myTexture, mySampler, v_uv);
  output.Diffuse.r=1.0;
  output.Diffuse.g=0.0;
  output.Diffuse.b=0.0;
  output.Diffuse.w=0.0;
  //  output.Diffuse = vec4<f32>(1.0, 0.0, 0.0, 0.0);

  return output;
}