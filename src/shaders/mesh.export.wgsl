struct MeshUniforms {
  transformation : mat4x4<f32>,
  @size(16) color : vec3<f32>,
  @size(12) ambient : vec3<f32>,
  shadow : f32,
  @size(16) spot_light : vec3<f32>,
  id : u32,
  point_light_squared:f32,          //30
  directional_light:f32,
  scenes:u32, //bitmask
  @size(128) z: f32  //padding
};