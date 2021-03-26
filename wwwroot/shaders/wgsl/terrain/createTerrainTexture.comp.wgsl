const minX:i32 = 5000;
const minZ:i32 = 5000;

const maxX:i32 = 5000;
const maxZ:i32 = 5000;

const subdivisionsX:i32 = 250;
const subdivisionsY:i32 = 250;

//const facetSize:u32= 250 * 250 * 4;
const facetSize:u32 = 62500; // 250 * 250;


const width:u32 = 10000;
const height:u32 = 10000;

[[block]] struct Plane {
  [[offset(0)]] norm : vec3<f32>;
  [[offset(12)]] d : f32;
};
[[block]] struct PlaneArray {
  [[offset(0)]] plane : [[stride(16)]] array<Plane>;
};
[[block]] struct IntArray {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};

[[binding(0), group(0)]] var<storage_buffer> slopes : [[access(read)]] IntArray;
[[binding(1), group(0)]] var<storage_buffer> facet12 : [[access(read)]] PlaneArray;
[[binding(0), group(1)]] var<storage_buffer> resultMatrix : [[access(write)]] IntArray;

[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

[[stage(compute)]]
fn main() -> void {

    var cx:i32 = i32(f32(GlobalInvocationID.x) * 1.95 - 5000.0);
    var cz:i32 = i32(f32(GlobalInvocationID.y) * 1.95 - 5000.0);

    var col:i32 = i32(floor(f32((cx + maxX) * subdivisionsX) / f32(width)));
    var row:i32 = i32(floor(- f32((cz + maxZ) * subdivisionsY) / f32(height) + f32(subdivisionsY)));
    var slope:i32 = slopes.numbers[row * 250 + col];
    var norm:vec3<f32>;
    var d:f32;
    if(cz < -1 * cx + slope) {
        norm = facet12.plane[row * 250 + col].norm;
        d = facet12.plane[row * 250 + col].d;
    } else {
        var index:u32 = facetSize + u32(row * 250 + col);
        norm = facet12.plane[index].norm;
        d = facet12.plane[index].d;
    }

    var y:f32 = -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
    if( y > 3.0 ) {
        resultMatrix.numbers[GlobalInvocationID.y * u32(5120) + GlobalInvocationID.x]=-16711936; //Int32 represation of uint8 0, 255, 0, 255
     } else {
        resultMatrix.numbers[GlobalInvocationID.y * u32(5120) + GlobalInvocationID.x]=-16711681; //Int32 represation of uint8 255, 255, 0, 255
     }
    return;
  }