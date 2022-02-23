struct Output {
  @location(0) Diffuse : vec4<f32>;
};

@stage(fragment)
fn main(
  @location(0)  normal : vec3<f32>,
  @location(1) @interpolate(flat)  id : u32,
  @location(2) color:vec3<f32>
) -> Output {
  var output:Output;
  output.Diffuse = vec4<f32>(color,1.0);
  return output;
}

struct OutputPick {
  @location(0) ID : u32;
};

@stage(fragment)
fn pick(
  @location(0)  normal : vec3<f32>,
  @location(1) @interpolate(flat)  id : u32,
  @location(2) color:vec3<f32>
) -> OutputPick {
  var output:OutputPick;
  output.ID = id;
  return output;
}