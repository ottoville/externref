struct Indices {
  numbers: array<u32>
};
struct Settings {
     size : vec2<u32>,
     bufferSize : vec2<u32>,
     subdivisions : u32,
     heightMinMax : vec2<i32>,
     @align(32) max : vec2<i32>,
     textureSize:vec2<u32>
};
@binding(0) @group(0) var<uniform> settings : Settings;
@binding(0) @group(1) var<storage,write> indices : Indices;


@stage(compute) @workgroup_size(1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  let idx1: u32 = (GlobalInvocationID.x + u32(1) + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  let idx2: u32 = (GlobalInvocationID.x + u32(1) + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  let idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  let idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  let index:u32 = GlobalInvocationID.y*settings.subdivisions*u32(6) + GlobalInvocationID.x*u32(6);
  indices.numbers[index] = idx1;
  indices.numbers[index+u32(1)]=idx2;
  indices.numbers[index+u32(2)]=idx3;

  indices.numbers[index+u32(3)]=idx4;
  indices.numbers[index+u32(4)]=idx1;
  indices.numbers[index+u32(5)]=idx3;
  return;
}