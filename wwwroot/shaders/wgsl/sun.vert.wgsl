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

[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), set(0)]] var<uniform> times : Time;
[[binding(0), set(1)]] var<uniform> worldposition : WorldPosition;

const sunDistance: f32= 1495000.0;  #divided by 100000 correct one

const vertices : array<vec2<f32>, 14> = array<vec2<f32>, 14>(
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

[[builtin(position)]] var<out> Position : vec4<f32>;
[[builtin(vertex_idx)]] var<in> VertexIndex : i32;

[[location(0)]] var<out> ambient : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  const vertexPosition : vec3<f32> = vec3<f32>(vertices[VertexIndex].xy,0.0);
  const curPos : vec3<f32> =worldposition.world[3].xyz+worldposition.delta*times.delta;
  const transform : vec3<f32> = curPos *sunDistance;
  const CameraRight_worldspace : vec3<f32> = vec3<f32>(uniforms.view[0].x, uniforms.view[1].x, uniforms.view[2].x);
  const CameraUp_worldspace : vec3<f32>  = vec3<f32>(uniforms.view[0].y, uniforms.view[1].y, uniforms.view[2].y);
 
 
  const transformbill : vec3<f32> =  transform  + CameraRight_worldspace * vertexPosition.x + CameraUp_worldspace * vertexPosition.y;

  Position = uniforms.modelViewProjectionMatrix * vec4<f32>(transformbill.xyz, 1.0);
  ambient=vec4<f32>(1.0,clamp(curPos.y*4.0,0.1,1.0),(max(curPos.y,0.0)),1.0);
  return;
}