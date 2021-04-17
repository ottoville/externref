[[block]] struct Indices {
  [[offset(0)]] numbers : [[stride(4)]] array<u32>;
};
[[block]] struct Settings {
    [[offset(0)]] size : vec2<u32>;
    [[offset(8)]] bufferSize : vec2<u32>;
    [[offset(16)]] subdivisions : u32;
    [[offset(20)]] heightMinMax : vec2<i32>;
    [[offset(32)]] maxXZ : vec2<i32>;
};
[[binding(0), group(0)]] var<storage_buffer> settings : [[access(read)]] Settings;
[[binding(0), group(1)]] var<storage_buffer> indices : [[access(write)]] Indices;

[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

[[stage(compute)]]
fn main() -> void {
  var idx1: u32 = (GlobalInvocationID.x + u32(1) + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  var idx2: u32 = (GlobalInvocationID.x + u32(1) + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  var idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (settings.subdivisions + u32(1)));
  var idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + u32(1)) * (settings.subdivisions + u32(1)));
  var index:u32 = GlobalInvocationID.y*settings.subdivisions*u32(6) + GlobalInvocationID.x*u32(6);
  indices.numbers[index] = idx1;
  indices.numbers[index+u32(1)]=idx2;
  indices.numbers[index+u32(2)]=idx3;

  indices.numbers[index+u32(3)]=idx4;
  indices.numbers[index+u32(4)]=idx1;
  indices.numbers[index+u32(5)]=idx3;
  return;
}