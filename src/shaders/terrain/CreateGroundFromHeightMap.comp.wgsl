let filt:vec3<f32> = vec3<f32>(0.3, 0.59, 0.11);

struct Settings {
     size : vec2<u32>;
     bufferSize : vec2<u32>;
     subdivisions : u32;
     heightMinMax : vec2<i32>;
    [[align(32)]] max : vec2<i32>;
     textureSize:vec2<u32>;
};
struct Vertice {
  position : vec3<f32>;
  normals : vec3<f32>;
  uv : vec2<f32>;
};
struct Vertices {
    vert : [[stride(48)]] array<Vertice>;
};
struct Pixels {
    pixels : [[stride(4)]] array<u32>;
};
[[binding(0), group(0)]] var<uniform> settings : Settings;
[[binding(0), group(1)]] var<storage, write> positions : Vertices;
[[binding(1), group(1)]] var<storage, read> pixels : Pixels;


[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
    var position: vec3<f32> = vec3<f32>(f32(GlobalInvocationID.x * settings.size.x) / f32(settings.subdivisions) - (f32(settings.size.x) / 2.0),
    0.0,
    f32((settings.subdivisions - GlobalInvocationID.y) * settings.size.y) / f32(settings.subdivisions) - (f32(settings.size.y) / 2.0));

   let heightmap:vec2<i32> = vec2<i32>(
       i32(((position.x + f32(settings.size.x) / 2.0) / f32(settings.size.x)) * f32(settings.bufferSize.x - u32(1))),
        i32((1.0 - (position.z + f32(settings.size.y) / 2.0) / f32(settings.size.y)) * f32(settings.bufferSize.y - u32(1)))
   );
   let pos:u32 = u32(heightmap.x + heightmap.y * i32(settings.bufferSize.x));
  
   let pixel:u32= pixels.pixels[pos];
   let normalized:vec3<f32> = (vec3<f32>(vec3<i32>(i32(pixel) & 0xff, i32(pixel>>u32(8)) & 0xff, i32(pixel>>u32(16)) & 0xff))) / vec3<f32>(255.0,255.0,255.0);
  
   let filtered:vec3<f32> = normalized * filt;
   let gradient:f32 = filtered.r + filtered.g + filtered.b;
  
   position.y = f32(settings.heightMinMax.x) + f32( settings.heightMinMax.y -  settings.heightMinMax.x) * gradient;
   positions.vert[GlobalInvocationID.y * (settings.subdivisions + u32(1)) + GlobalInvocationID.x].position = position;
  
   positions.vert[GlobalInvocationID.y * (settings.subdivisions + u32(1)) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(settings.max)) / vec2<f32>(settings.size);
    return;
  }