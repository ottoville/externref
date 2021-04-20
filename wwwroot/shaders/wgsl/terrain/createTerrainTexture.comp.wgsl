[[block]] struct Settings {
     size : vec2<u32>;
     bufferSize : vec2<u32>;
     subdivisions : u32;
     heightMinMax : vec2<i32>;
    [[align(32)]] max : vec2<i32>;
};


[[block]] struct Plane {
  norm : vec3<f32>;
  [[offset(12)]] d : f32;
};
[[block]] struct PlaneArray {
  plane : [[stride(16)]] array<Plane>;
};
[[block]] struct IntArray {
  numbers : [[stride(4)]] array<i32>;
};
[[binding(0), group(0)]] var<storage_buffer> settings : [[access(read)]] Settings;
[[binding(0), group(1)]] var<storage_buffer> slopes : [[access(read)]] IntArray;
[[binding(1), group(1)]] var<storage_buffer> facet12 : [[access(read)]] PlaneArray;
[[binding(0), group(2)]] var<storage_buffer> resultMatrix : [[access(write)]] IntArray;


[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) -> void {
    let facetSize:u32 = settings.subdivisions * settings.subdivisions; // 250 * 250;

    let cx:i32 = i32(f32(GlobalInvocationID.x) * 1.95 - f32(settings.size.x/u32(2)));
    let cz:i32 = i32(f32(GlobalInvocationID.y) * 1.95 - f32(settings.size.y/u32(2)));

    let col:u32 = u32(floor(f32((cx + settings.max.x) * i32(settings.subdivisions)) / f32(settings.size.x)));
    let row:u32 = u32(floor(- f32((cz + settings.max.y) * i32(settings.subdivisions)) / f32(settings.size.y) + f32(settings.subdivisions)));
    let slope:i32 = slopes.numbers[row * settings.subdivisions + col];
    var norm:vec3<f32>;
    var d:f32;
    if(cz < -1 * cx + slope) {
        norm = facet12.plane[row * settings.subdivisions + col].norm;
        d = facet12.plane[row * settings.subdivisions + col].d;
    } else {
        let index:u32 = facetSize + (row * settings.subdivisions + col);
        norm = facet12.plane[index].norm;
        d = facet12.plane[index].d;
    }

    let y:f32 = -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
    if( y > 3.0 ) {
        resultMatrix.numbers[GlobalInvocationID.y * u32(5120) + GlobalInvocationID.x]=-16711936; //Int32 represation of uint8 0, 255, 0, 255
     } else {
        resultMatrix.numbers[GlobalInvocationID.y * u32(5120) + GlobalInvocationID.x]=-16711681; //Int32 represation of uint8 255, 255, 0, 255
     }
    return;
  }