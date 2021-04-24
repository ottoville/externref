let filt:vec3<f32> = vec3<f32>(0.3, 0.59, 0.11);

[[block]] struct Settings {
    size : vec2<u32>;
    bufferSize : vec2<u32>;
    subdivisions : u32;
    heightMinMax : vec2<i32>;
    maxXZ : vec2<i32>;
};
struct Vertice {
  position : vec3<f32>;
  [[offset(16)]] normals : vec3<f32>;
  [[offset(32)]] uv : vec2<f32>;
};
[[block]] struct Vertices {
    vert : [[stride(48)]] array<Vertice>;
};
[[block]] struct Pixels {
    pixels : [[stride(4)]] array<u32>;
};
[[binding(0), group(0)]] var<storage_buffer> img : [[access(read)]] Settings;
[[binding(0), group(1)]] var<storage_buffer> positions : [[access(write)]] Vertices;
[[binding(1), group(1)]] var<storage_buffer> pixels : [[access(read)]] Pixels;


[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) -> void {
    var position: vec3<f32> = vec3<f32>(f32(GlobalInvocationID.x * img.size.x) / f32(img.subdivisions) - (f32(img.size.x) / 2.0),
    0.0,
    f32((img.subdivisions - GlobalInvocationID.y) * img.size.y) / f32(img.subdivisions) - (f32(img.size.y) / 2.0));

   let heightmap:vec2<i32> = vec2<i32>(
       i32(((position.x + f32(img.size.x) / 2.0) / f32(img.size.x)) * f32(img.bufferSize.x - u32(1))),
        i32((1.0 - (position.z + f32(img.size.y) / 2.0) / f32(img.size.y)) * f32(img.bufferSize.y - u32(1)))
   );
   let pos:u32 = u32(heightmap.x + heightmap.y * i32(img.bufferSize.x));
  
   let pixel:u32= pixels.pixels[pos];
   let normalized:vec3<f32> = (vec3<f32>(vec3<i32>(i32(pixel) & 0xff, i32(pixel>>u32(8)) & 0xff, i32(pixel>>u32(16)) & 0xff))) / vec3<f32>(255.0,255.0,255.0);
  
   let filtered:vec3<f32> = normalized * filt;
   let gradient:f32 = filtered.r + filtered.g + filtered.b;
  
   position.y = f32(img.heightMinMax.x) + f32( img.heightMinMax.y -  img.heightMinMax.x) * gradient;
   positions.vert[GlobalInvocationID.y * (img.subdivisions + u32(1)) + GlobalInvocationID.x].position = position;
  
   positions.vert[GlobalInvocationID.y * (img.subdivisions + u32(1)) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(img.maxXZ)) / vec2<f32>(img.size);
    return;
  }