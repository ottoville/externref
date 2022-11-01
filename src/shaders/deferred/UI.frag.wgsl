struct Output {
  @location(0) Color : vec4<f32>
};
@binding(1) @group(0) var texture: texture_2d<f32>;
@fragment
fn main(
  @builtin(position) fragCoord : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
) -> Output {
  let fragCoordI=vec2<i32>(floor(v_uv));
  let color:vec4<f32> = textureLoad(texture, fragCoordI, 0);

  var output:Output;

  //output.Color=vec4<f32>(0.5,0.5,0.5,1.0);
  output.Color=color;
  return output;
}
