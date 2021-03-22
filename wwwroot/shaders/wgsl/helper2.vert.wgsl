[[location(0)]] var<out> color : vec3<f32>;

const vertices : array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2<f32>( -0.5,  2.0),
    vec2<f32>( -0.5, -2.0),
    vec2<f32>( 0.5,  3.0),
    vec2<f32>( 0.5, -3.0)
);
[[block]] struct Scene {
  [[offset(0)]] viewProjection : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] cameraPosition : vec3<f32>;
};
[[binding(0), group(0)]] var<uniform> scene : Scene;

[[block]] struct Time {
  [[offset(0)]] time : u32;
  [[offset(4)]] delta : f32;
};

[[binding(1), group(0)]] var<uniform> time : Time;

[[block]] struct IntArray {
  [[offset(0)]] numbers : [[stride(4)]] array<i32>;
};
[[binding(0), group(1)]] var<storage_buffer> slopes : [[access(read)]] IntArray;

[[block]] struct Plane {
  [[offset(0)]] norm : vec3<f32>;
  [[offset(12)]] d : f32;
};
[[block]] struct PlaneArray {
  [[offset(0)]] plane : [[stride(16)]] array<Plane>;
};
[[binding(1), group(1)]] var<storage_buffer> facet12 : [[access(read)]] PlaneArray;

[[block]] struct WorldPosition {
  [[offset(0)]] position : mat4x4<f32>;
};
[[binding(0), group(2)]] var<uniform> world : WorldPosition;


//const PI:f32 = 3.1415926535897932384626433832795;
const angleStep:f32 = 0.7853981633974483; //(PI * 2.0) / 8.0;

const facetSize:u32 = 62500; //250 * 250;
const maxX:u32 = 5000;
const maxZ:u32 = 5000;

const subdivisionsX:u32 = 250;
const subdivisionsY:u32 = 250;

const width:u32 = 10000;
const height:u32 = 10000;

[[builtin(instance_index)]] var<in> instanceIdx : i32;
[[builtin(vertex_idx)]] var<in> VertexIndex : i32;
[[builtin(position)]] var<out> Position : vec4<f32>;

fn getHeightAtCoordinates(xz:vec2<f32>) -> f32 {
    var cx:f32 = xz.x;
    var cz:f32 = xz.y;

    var col:i32 = i32(floor((cx + f32(maxX)) * f32(subdivisionsX) / f32(width)));
    var row:i32 = i32(floor(- (cz + f32(maxZ)) * f32(subdivisionsY) / f32(height) + f32(subdivisionsY)));
    var slope:i32 = slopes.numbers[row * 250 + col];
    var norm:vec3<f32>;
    var d:f32;
    if(cz < -1.0 * cx + f32(slope)) {
        norm = facet12.plane[row * 250 + col].norm;
        d = facet12.plane[row * 250 + col].d;
    } else {
        var index:u32 = facetSize + (row * 250 + col);
        norm = facet12.plane[index].norm;
        d = facet12.plane[index].d;
    }
    return -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
 }

[[stage(vertex)]]
fn main() -> void {
    var angle:f32 = (f32(time.time) * 0.001) + f32(instanceIdx) * angleStep;
    var c:f32 = cos(angle);
    var s:f32 = sin(angle);
    var position:vec3<f32> =vec3<f32>(vertices[VertexIndex].x,1.5,vertices[VertexIndex].y);
    var rotated:vec2<f32> =vec2<f32>(position.x * c - position.z * s, position.x * s + position.z * c);
    var offset:vec2<f32> = rotated + vec2<f32>(10.0 * c, 10.0 * s);


    var worldPos:vec4<f32> = world.position * vec4<f32>(offset.x, position.y, offset.y, 1.0);
    worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 3.0;
    Position = scene.viewProjection * worldPos;
    color = vec3<f32>(1.0,1.0,1.0);
    return;
}