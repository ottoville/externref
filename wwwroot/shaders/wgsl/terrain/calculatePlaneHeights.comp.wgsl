const subdivisions:u32 = 250;
const facetSize:u32 = 250000; // 250 * 250 * 4;
const stride:u32 = 12;

[[block]] struct Vertice {
  [[offset(0)]] position : vec3<f32>;
  [[offset(16)]] normals : vec3<f32>;
  [[offset(32)]] uv : vec2<f32>;
};
[[block]] struct IntArray {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};
[[block]] struct Vertices {
    [[offset(0)]] vert : [[stride(48)]] array<Vertice>;
};

[[binding(0), group(0)]] var<storage_buffer> plane : [[access(read)]] Vertices;
[[binding(0), group(1)]] var<storage_buffer> slopes : [[access(write)]] IntArray;
[[block]] struct FloatArray {
  [[offset(0)]] numbers : [[stride(4)]] array<f32>;
};
[[binding(1), group(1)]] var<storage_buffer> facet12 : [[access(write)]] FloatArray;
[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

const cd: f32 = -1.0;
[[stage(compute)]]
fn main() -> void {
    var idx1:u32 = (GlobalInvocationID.x + 1 + (GlobalInvocationID.y + 1) * (subdivisions + 1));
    var idx2:u32 = (GlobalInvocationID.x + 1 + GlobalInvocationID.y * (subdivisions + 1));
    var idx3:u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (subdivisions + 1));
    var idx4:u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + 1) * (subdivisions + 1));


    //calculateHeightSquad(row, col);
    var i:u32 = GlobalInvocationID.y * stride;
    var j:u32 = GlobalInvocationID.x * (subdivisions + 1) * stride;
    var k:u32 = (GlobalInvocationID.x + 1) * (subdivisions + 1) * stride;


    var v1arr:vec3<f32> = plane.vert[j + i].position;
    var v2arr:vec3<f32> =  plane.vert[j + i + 1].position;

    var v1v3:vec3<f32> = plane.vert[k + i].position - v1arr;
    var v1v4:vec3<f32> = plane.vert[k + i + 1].position - v1arr;

    //   cd = (terrainPositions[k + i + 2] - v1arr[2]) / (terrainPositions[k + i + 3] - v1arr[0]);

    var h:i32 = i32(v1arr.z - cd * v1arr.x);             // v1 belongs to the slope

    // facet equations :
    // we compute each facet normal vector
    // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
    // we compute the value d by applying the equation to v1 which belongs to the plane
    // then we store the facet equation in a Vector4

    var v1v2:vec3<f32> = v2arr - v1arr;
    var norm1:vec3<f32> = normalize(cross(v1v4, v1v3));

    var norm2:vec3<f32> = normalize(cross(v1v2, v1v4));

    var d1:f32 = dot(norm1,v1arr) * -1.0;
    var d2:f32 = dot(norm2,v2arr) * -1.0;

    slopes.numbers[GlobalInvocationID.x * subdivisions + GlobalInvocationID.y] = h;

    facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4]= norm1.x;
    facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 1]= norm1.y;
    facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 2]= norm1.z;
    facet12.numbers[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 3]= d1;

    facet12.numbers[facetSize +  ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4)]= norm2.x;
    facet12.numbers[facetSize + ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 1)]= norm2.y;
    facet12.numbers[facetSize + ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 2)]= norm2.z;
    facet12.numbers[facetSize + ((GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y) * 4 + 3)]= d2;
    return;
 }