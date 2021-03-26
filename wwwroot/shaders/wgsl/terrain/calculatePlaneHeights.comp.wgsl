const subdivisions:u32 = 250;
const subdivisions_plus_one:u32 = 251;
//const facetSize:u32 = 250000; // 250 * 250 * 4;
const facetSize:u32 = 62500; // 250 * 250;

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

[[binding(0), group(0)]] var<storage_buffer> vertices : [[access(read)]] Vertices;
[[binding(0), group(1)]] var<storage_buffer> slopes : [[access(write)]] IntArray;

[[block]] struct Plane {
  [[offset(0)]] norm : vec3<f32>;
  [[offset(12)]] d : f32;
};
[[block]] struct PlaneArray {
  [[offset(0)]] plane : [[stride(16)]] array<Plane>;
};
[[binding(1), group(1)]] var<storage_buffer> facet12 : [[access(write)]] PlaneArray;

[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

const cd: f32 = -1.0;
[[stage(compute)]]
fn main() -> void {
    const next_x:u32=GlobalInvocationID.x + u32(1);
    const next_y:u32=GlobalInvocationID.y + u32(1);

    var idx1:u32 = (next_x + next_y * subdivisions_plus_one);
    var idx2:u32 = (next_x + GlobalInvocationID.y * subdivisions_plus_one);
    var idx3:u32 = (GlobalInvocationID.x + GlobalInvocationID.y * subdivisions_plus_one);
    var idx4:u32 = (GlobalInvocationID.x + next_y * subdivisions_plus_one);


    //calculateHeightSquad(row, col);
    var i:u32 = GlobalInvocationID.y;
    var j:u32 = GlobalInvocationID.x * subdivisions_plus_one;
    var k:u32 = next_x * subdivisions_plus_one;


    var v1arr:vec3<f32> = vertices.vert[j + i].position;
    var v2arr:vec3<f32> =  vertices.vert[j + i + u32(1)].position;

    var v1v3:vec3<f32> = vertices.vert[k + i].position - v1arr;
    var v1v4:vec3<f32> = vertices.vert[k + i + u32(1)].position - v1arr;

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


    slopes.numbers[GlobalInvocationID.x * subdivisions + GlobalInvocationID.y] = h;

    facet12.plane[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y)].norm = norm1;
    facet12.plane[(GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y)].d = dot(norm1,v1arr) * -1.0;

    facet12.plane[facetSize +  (GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y)].norm = norm2;
    facet12.plane[facetSize + (GlobalInvocationID.x * subdivisions +  GlobalInvocationID.y)].d = dot(norm2,v2arr) * -1.0;

    return;
 }