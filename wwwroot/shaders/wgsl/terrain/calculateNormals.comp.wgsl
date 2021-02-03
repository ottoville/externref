const subdivisions : u32 = 250;
const facetSize : u32 = 250000; //250*250* 4;
const stride : u32 = 12;

[[block]] struct FloatArray {
  [[offset(0)]] numbers : [[stride(4)]] array<f32>;
};
[[binding(0), group(0)]] var<storage_buffer> normals : [[access(write)]] FloatArray;

[[block]] struct Slopes {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};
[[binding(0), group(1)]] var<storage_buffer> slopes : [[access(read)]] Slopes;

[[block]] struct Slopes {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};
[[binding(1), group(1)]] var<storage_buffer> facet12 : [[access(read)]] FloatArray;
[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

[[stage(compute)]]
fn main() -> void {

    var i:u32 = GlobalInvocationID.y * stride;
    var j:u32 = GlobalInvocationID.x * (subdivisions + 1) * stride;


    var norm1:vec3<f32> =vec3<f32>(
        facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4],
        facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 +1],
        facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 +2]
    );
    var norm2:vec3<f32> =vec3<f32>(
        facet12.numbers[facetSize +  ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4)],
        facet12.numbers[facetSize + ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 +1)],
        facet12.numbers[facetSize + ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 +2)]
    );
    var norm4:vec3<f32> =vec3<f32>(
        facet12.numbers[facetSize +  (((GlobalInvocationID.x) * subdivisions +  (GlobalInvocationID.y - 1)) * 4)],
        facet12.numbers[facetSize + (((GlobalInvocationID.x) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 +1)],
        facet12.numbers[facetSize + (((GlobalInvocationID.x) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 +2)]
    );

    var norm5:vec3<f32> =vec3<f32>(
        facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y)) * 4],
        facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y)) * 4 +1],
        facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y)) * 4 +2]
    );
    var norm7:vec3<f32> =vec3<f32>(
       facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4],
       facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 +1],
       facet12.numbers[((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 +2]
    );
    var norm8:vec3<f32> =vec3<f32>(
        facet12.numbers[facetSize +  (((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4)],
        facet12.numbers[facetSize + (((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 + 1)],
        facet12.numbers[facetSize + (((GlobalInvocationID.x - 1) * subdivisions +  (GlobalInvocationID.y - 1)) * 4 + 2)]
    );

    var normalized:vec3<f32> = normalize(norm1 + norm2 + norm4 + norm5 + norm7 + norm8);
    
    //1 and 2
    //1 and 3   close   1
    //1 and 4
    //1 and 5
    //1 and 6   close 1
    //1 and 7   close 1
    //1 and 8
    //2 and 3   close 2
    //2 and 4   close 3
    //2 and 5   close 1
    //2 and 6   close 1
    //2 and 7   close 1
    //2 and 8   close 1
    //3 and 4   close 1
    //3 and 5   close 2
    //3 and 6   VERY CLOSE
    //3 and 7   close 1
    //3 and 8   close 1
    //4 and 5   close 3
    //4 and 6   close 1
    //4 and 7   close 1
    //4 and 8   close 1
    //5 and 6   far
    //5 and 7   close 1
    //5 and 8   far
    //6 and 7   far
    //6 and 8   close 1
    //7 and 8   far
    

    normals.numbers[j + i + 4]=normalized.x;
    normals.numbers[j + i + 5]=normalized.y;
    normals.numbers[j + i + 6]=normalized.z;
    return;
 }