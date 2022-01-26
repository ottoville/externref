struct Output {
  @location(0) ID : u32;
  @location(1) Diffuse : vec4<f32>;
};
@binding(0) @group(2) var mySampler: sampler;
@binding(1) @group(2) var diffuseTexture: texture_2d<f32>;

//[[location(1)]] var<in> ambient: vec3<f32>;

@stage(fragment)
fn main(@location(0) v_uv : vec4<f32>,
  @location(1) position : vec3<f32>,
  @location(2) @interpolate(flat) id : u32) -> Output {

  var output:Output;
  let uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);

  output.ID=id;
  output.Diffuse=textureSample(diffuseTexture, mySampler, uv);
  output.Diffuse.w=0.0;

  return output;
}