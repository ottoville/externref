let filt:vec4<f32> = vec4<f32>(0.3, 0.59, 0.11, 0.0);

struct Settings {
     size : vec2<u32>,
     bufferSize : vec2<u32>,
     subdivisions : u32,
     heightMinMax : vec2<i32>,
     @align(32) max : vec2<i32>,
     textureSize:vec2<u32>
};
struct Vertice {
  position : vec3<f32>,
  normals : vec3<f32>,
  @size(16) uv : vec2<f32>
};
struct Vertices {
    vert: array<Vertice>
};
struct Pixels {
    pixels: array<u32>
};
@binding(0) @group(0) var<uniform> settings : Settings;
@binding(0) @group(1) var<storage, write> positions : Vertices;
@binding(1) @group(1) var pixels : texture_2d<f32>;


@stage(compute) @workgroup_size(1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    let coords=vec2<f32>(
        f32(GlobalInvocationID.x * settings.size.x) / f32(settings.subdivisions),
        f32(GlobalInvocationID.y * settings.size.y) / f32(settings.subdivisions)
    );
    var position: vec3<f32> = vec3<f32>(f32(GlobalInvocationID.x * settings.size.x) / f32(settings.subdivisions) - (f32(settings.size.x) / 2.0),
    0.0,
    f32((settings.subdivisions - GlobalInvocationID.y) * settings.size.y) / f32(settings.subdivisions) - (f32(settings.size.y) / 2.0));
    // TODO: move to uniform
   let texture_size:vec2<i32> = textureDimensions(pixels);


   let gradient:f32 = dot(textureLoad(pixels, vec2<i32>((vec2<f32>(texture_size)/vec2<f32>(settings.size)) * coords.xy), 0), filt);    

   position.y = f32(settings.heightMinMax.x) + f32( settings.heightMinMax.y -  settings.heightMinMax.x) * gradient;
   //position.y = 10.0;
   positions.vert[GlobalInvocationID.y * (settings.subdivisions + u32(1)) + GlobalInvocationID.x].position = position;
  
   positions.vert[GlobalInvocationID.y * (settings.subdivisions + u32(1)) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(settings.max)) / vec2<f32>(settings.size);
   return;
}