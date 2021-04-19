
[[location(0)]] var<out> outColor : vec4<f32>;

[[block]] struct Lights {
  [[offset(48)]] sunDirection : vec3<f32>;
  [[offset(80)]] ambient : vec3<f32>;
  [[offset(92)]] shadow : f32;
};
[[block]] struct LightsArray {
  [[offset(0)]] light : [[stride(256)]] array<Lights>;
};
[[binding(0), set(0)]] var mySampler: sampler;
[[binding(1), set(0)]] var normalTexture: texture_2d<f32>;
[[binding(2), set(0)]] var positionTexture: texture_2d<f32>;
[[binding(3), set(0)]] var diffuseTexture: texture_2d<f32>;

[[binding(4), group(0)]] var<storage_buffer> lights : [[access(read)]] LightsArray;



[[stage(fragment)]]
fn main([[location(0)]] position:vec2<f32>) -> void {

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