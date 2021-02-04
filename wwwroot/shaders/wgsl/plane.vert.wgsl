[[location(0)]] var<out> color : vec3<f32>;

[[block]] struct Scene {
  [[offset(0)]] viewProjection : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};
[[binding(0), group(0)]] var<uniform> scene : Scene;

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

[[location(0)]] var<in> position : vec3<f32>;
[[builtin(position)]] var<out> Position : vec4<f32>;

const facetSize:u32= 62500; //250 * 250;
const maxX:u32 =5000;
const maxZ:u32 =5000;

const subdivisionsX:u32 = 250;
const subdivisionsY:u32 = 250;

const width:u32 = 10000;
const height:u32 = 10000;

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
        norm = facet12.plane[facetSize + (row * 250 + col)].norm;
        d = facet12.plane[facetSize + (row * 250 + col)].d;
    }
    return -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
 }

[[stage(vertex)]]
fn main() -> void {
    var worldPos:vec4<f32> = world.position * vec4<f32>(position.x, 0, position.y, 1.0);
    worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz);
    Position = scene.viewProjection * worldPos;
    color = vec3<f32>(1.0,1.0,1.0);
    return;
}