[[location(0)]] var<in> position:vec2<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};
[[block]] struct LightsArray {
  [[offset(0)]] light : [[stride(256)]] array<Lights>;
};
[[binding(0), group(0)]] var<uniform_constant> mySampler: sampler;
[[binding(1), group(0)]] var<uniform_constant> normalTexture: texture_2d<f32>;
[[binding(2), group(0)]] var<uniform_constant> positionTexture: texture_2d<f32>;
[[binding(3), group(0)]] var<uniform_constant> diffuseTexture: texture_2d<f32>;

[[binding(4), group(0)]] var<storage_buffer> lights : [[access(read)]] LightsArray;



[[stage(fragment)]]
fn main() -> void {

const sunOffset:u32 = u32(0);

  const diffuse:vec4<f32> = textureSample(diffuseTexture, mySampler, position.xy);
  if(diffuse.w == 0.0) {
    outColor=vec4<f32>(diffuse.xyz,1.0);
    return;
  }
  const normal:vec4<f32> = normalize(textureSample(normalTexture, mySampler, position.xy));

  const shading :f32 = dot(normal.xyz, lights.light[sunOffset].sunDirection)*lights.light[sunOffset].shadow;
  outColor = vec4<f32>(lights.light[sunOffset].ambient + (diffuse.xyz * shading),1.0);

  return;
}