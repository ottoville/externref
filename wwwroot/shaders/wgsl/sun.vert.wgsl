[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
  [[offset(64)]] view : mat4x4<f32>;
  [[offset(128)]] viewPosition : vec3<f32>;
};

[[block]] struct Time {
  [[offset(0)]] time : u32;
  [[offset(4)]] delta : f32;
};

[[block]] struct WorldPosition {
  [[offset(0)]] world : mat4x4<f32>;
  [[offset(64)]] delta : vec3<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> times : Time;
//[[binding(0), set(1)]] var<uniform> worldposition : WorldPosition;

let sunDistance: f32= 1495000.0;  //divided by 100000 correct one

let vertices : array<vec2<f32>, 14> = array<vec2<f32>, 14>(
            vec2<f32>( -6824.0,  1557.0),
            vec2<f32>( -6824.0, -1557.0),
            vec2<f32>( -5472.0,  4364.0),
            vec2<f32>( -5472.0, -4364.0),
            vec2<f32>( -3037.0,  6306.0),
            vec2<f32>( -3037.0, -6306.0),
            vec2<f32>(     0.0,  7000.0),
            vec2<f32>(     0.0, -7000.0),
            vec2<f32>(  3037.0,  6306.0),
            vec2<f32>(  3037.0, -6306.0),
            vec2<f32>(  5472.0,  4364.0),
            vec2<f32>(  5472.0, -4364.0),
            vec2<f32>(  6824.0,  1557.0),
            vec2<f32>(  6824.0, -1557.0)
    );


//[[location(0)]] var<out> ambient : vec4<f32>;

struct Output {
  [[builtin(position)]] Position : vec4<f32>;
};


[[stage(vertex)]]
fn main([[builtin(vertex_idx)]] VertexIndex : i32) -> Output {
  var output:Output;
  //let curPos : vec3<f32> =worldposition.world[3].xyz+worldposition.delta*times.delta;
  //fix
  let curPos : vec3<f32> = vec3<f32>(0.0,1.0,0.0);
  let transform : vec3<f32> = curPos * sunDistance;
  let CameraRight_worldspace : vec3<f32> = vec3<f32>(uniforms.view[0].x, uniforms.view[1].x, uniforms.view[2].x);
  let CameraUp_worldspace : vec3<f32>  = vec3<f32>(uniforms.view[0].y, uniforms.view[1].y, uniforms.view[2].y);
 
 
  let transformbill : vec3<f32> =  transform  + CameraRight_worldspace * vertices[VertexIndex].x + CameraUp_worldspace * vertices[VertexIndex].y;

  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(transformbill.xyz, 1.0);
  output.Position.z=1.0;
  //ambient=vec4<f32>(1.0,clamp(curPos.y*4.0,0.1,1.0),(max(curPos.y,0.0)),1.0);
  return output;
}