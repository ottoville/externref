const subdivisions : i32 = 250;

[[block]] struct Indices {
  [[offset(0)]] numbers : [[stride(4)]] array<u32>;
};
[[binding(0), group(0)]] var<storage_buffer> indices : Indices;
[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;
[[stage(compute)]]
fn main() -> void {
  var idx1: u32 = (GlobalInvocationID.x + 1 + (GlobalInvocationID.y + 1) * (subdivisions + 1));
  var idx2: u32 = (GlobalInvocationID.x + 1 + GlobalInvocationID.y * (subdivisions + 1));
  var idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (subdivisions + 1));
  var idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + 1) * (subdivisions + 1));
  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6] = idx1;
  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6+1]=idx2;
  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6+2]=idx3;

  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6+3]=idx4;
  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6+4]=idx1;
  indices.numbers[GlobalInvocationID.y*250*6 + GlobalInvocationID.x*6+5]=idx3;
  return;
}