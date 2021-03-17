[[location(0)]] var<in> position:vec2<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[binding(0), set(0)]] var<uniform_constant> mySampler: sampler;
[[binding(1), set(0)]] var<uniform_constant> normalTexture: texture_2d<f32>;
[[binding(2), set(0)]] var<uniform_constant> positionTexture: texture_2d<f32>;
[[binding(3), set(0)]] var<uniform_constant> diffuseTexture: texture_2d<f32>;


[[stage(fragment)]]
fn main() -> void {
  const normal:vec4<f32> = textureSample(normalTexture, mySampler, position.xy);
  const diffuse:vec4<f32> = textureSample(diffuseTexture, mySampler, position.xy);
  const shading :f32 = dot(normal.xyz, vec3<f32>(0.0,1.0,0.0));
  outColor = vec4<f32>(diffuse.xyz * shading,1.0);
  return;
}