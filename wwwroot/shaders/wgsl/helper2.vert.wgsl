
let vertices : array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2<f32>( -0.5,  2.0),
    vec2<f32>( -0.5, -2.0),
    vec2<f32>( 0.5,  3.0),
    vec2<f32>( 0.5, -3.0)
);
[[block]] struct Scene {
   viewProjection : mat4x4<f32>;
   view : mat4x4<f32>;
   cameraPosition : vec3<f32>;
};

[[block]] struct Time {
  [[offset(0)]] time : u32;
  [[offset(4)]] delta : f32;
};

[[block]] struct IntArray {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};

[[block]] struct Plane {
  [[offset(0)]] norm : vec3<f32>;
  [[offset(12)]] d : f32;
};
[[block]] struct PlaneArray {
  [[offset(0)]] plane : [[stride(16)]] array<Plane>;
};

[[block]] struct WorldPosition {
  position : mat4x4<f32>;
  [[size(16)]] delta : vec3<f32>;
  [[size(16)]] custom : vec3<f32>;
  [[size(16)]] acceleration : vec3<f32>;
   id : u32;
};
[[block]] struct Settings {
     size : vec2<u32>;
     bufferSize : vec2<u32>;
     subdivisions : u32;
     heightMinMax : vec2<i32>;
    [[align(32)]] max : vec2<i32>;
};
[[binding(0), group(0)]] var<uniform> scene : Scene;
[[binding(1), group(0)]] var<uniform> time : Time;
[[binding(0), group(1)]] var<uniform> world : WorldPosition;
[[binding(0), group(2)]] var<storage_buffer> slopes : [[access(read)]] IntArray;
[[binding(1), group(2)]] var<storage_buffer> facet12 : [[access(read)]] PlaneArray;
[[binding(2), group(2)]] var<storage_buffer> settings : [[access(read)]] Settings;


//let PI:f32 = 3.1415926535897932384626433832795;
let angleStep:f32 = 0.7853981633974483; //(PI * 2.0) / 8.0;

let maxX:u32 = 5000;
let maxZ:u32 = 5000;

let subdivisionsX:u32 = 260;
let subdivisionsY:u32 = 260;

let width:u32 = 10000;
let height:u32 = 10000;


fn getHeightAtCoordinates(xz:vec2<f32>, facetSize:u32) -> f32 {
    let col:u32 = u32(floor((xz.x + f32(settings.max.x)) * f32(settings.subdivisions) / f32(width)));
    let row:u32 = u32(floor(- (xz.y + f32(settings.max.z)) * f32(settings.subdivisions) / f32(height) + f32(settings.subdivisions)));
    let slope:f32 = f32(slopes.numbers[row * settings.subdivisions + col]);
    var norm:vec3<f32>;
    var d:f32;
    if(xz.y < -1.0 * xz.x + slope) {
        norm = facet12.plane[row * settings.subdivisions + col].norm;
        d = facet12.plane[row * settings.subdivisions + col].d;
    } else {
        var index:u32=facetSize + u32(row * settings.subdivisions + col);
        norm = facet12.plane[index].norm;
        d = facet12.plane[index].d;
    }
    return -(norm.x * f32(xz.x) + norm.z * f32(xz.y) + d) / norm.y;
 };
struct Output {
  [[location(0)]] color : vec3<f32>;
  [[builtin(position)]] Position : vec4<f32>;
};

[[stage(vertex)]]
fn main(
  [[builtin(instance_index)]] instanceIdx : i32,
[[builtin(vertex_idx)]] VertexIndex : i32) -> Output {
    var output:Output;
    let facetSize:u32 = settings.subdivisions * settings.subdivisions; //250 * 250;

    var angle:f32 = (f32(time.time) * 0.001) + f32(instanceIdx) * angleStep;
    var c:f32 = cos(angle);
    var s:f32 = sin(angle);
    var position:vec3<f32> =vec3<f32>(vertices[VertexIndex].x,1.5,vertices[VertexIndex].y);
    var rotated:vec2<f32> =vec2<f32>(position.x * c - position.z * s, position.x * s + position.z * c);
    var offset:vec2<f32> = rotated + vec2<f32>(10.0 * c, 10.0 * s);


    var worldPos:vec4<f32> = world.position * vec4<f32>(offset.x, position.y, offset.y, 1.0);
    worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz, facetSize) + 3.0;
    output.Position = scene.viewProjection * worldPos;
    output.color = vec3<f32>(1.0,1.0,1.0);
    return output;
}