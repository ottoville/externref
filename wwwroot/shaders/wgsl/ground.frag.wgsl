//[[location(0)]] var<out> outColor : vec4<f32>;
struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Diffuse : vec4<f32>;
};
struct Meshes {
  position : mat4x4<f32>;
  [[size(16)]] y: f32;  //padding
  ambient : vec3<f32>;
  shadow : f32;
  [[size(20)]] x: f32;  //padding
  point_light_squared : f32;
  directional_light : f32;
  scenes:u32;
};
[[block]] struct MeshArray {
  length:u32;
  pointers: array<u32, 63>;
  mesh : [[stride(256)]] array<Meshes>;
};
[[block]] struct Projection {
  inversed_projection : mat4x4<f32>;
  reversed_projection:mat4x4<f32>;
  projectionFarPlane:mat4x4<f32>;
  zNear : f32;
  zFar : f32;
  z_near_multiplied_far: f32;
  z_near_substracted_far: f32;
  slice_scale:f32;
  slice_bias:f32;
};
[[block]] struct Uniforms {
  screenDimensions : vec2<f32>;
  screendimensions_ratio:vec2<f32>;
};
struct ClusterBounds {
  minAABB : vec3<f32>;
  maxAABB : vec3<f32>;
};
[[block]] struct Clusters {
  bounds : [[stride(32)]] array<ClusterBounds, 27648>; //32 * 18 * 48 = total tiles = 27648
  lightsCount: [[stride(4)]] array<u32, 27648>;
  lights: [[stride(4)]] array<u32, 1741824>;  //27648 * 63 = 1741824
};
[[binding(2), group(0)]] var<storage, read> clusters_array : Clusters;
[[binding(3), group(0)]] var<uniform> dimensions : Uniforms;
[[binding(4), group(0)]] var<storage, read> meshes : MeshArray;
[[binding(5), group(0)]] var<uniform> projection : Projection;

[[binding(0), group(2)]] var mySampler: sampler;
[[binding(1), group(2)]] var myTexture: texture_2d<f32>;

fn linearDepth(depthSample : f32) -> f32 {
  return projection.z_near_multiplied_far / fma(depthSample, projection.z_near_substracted_far, projection.zNear);
}
fn getTile(fragCoord : vec3<f32>) -> vec3<u32> {
  // TODO: move to uniform
  let tileCount : vec3<f32> = vec3<f32>(32.0, 18.0, 48.0);
  
  //TODO: zTile lookup can be hardcoded for speed
  let zTile : u32 = u32(max(fma(log2(linearDepth(fragCoord.z)),projection.slice_scale,projection.slice_bias), 0.0));
  let pos: vec2<f32> = fragCoord.xy / dimensions.screendimensions_ratio;
  return vec3<u32>(u32(pos.x),u32(pos.y),zTile);

}
fn getClusterIndex2(fragCoord : vec4<f32>) -> u32 {
  let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);

  let tile = getTile(fragCoord.xyz);
  return tile.x +
         tile.y * tileCount.x +
         tile.z * tileCount.x * tileCount.y;
}
    var<private> colorSet : array<vec3<f32>, 9> = array<vec3<f32>, 9>(
      vec3<f32>(1.0, 0.0, 0.0),
      vec3<f32>(1.0, 0.5, 0.0),
      vec3<f32>(0.5, 1.0, 0.0),
      vec3<f32>(0.0, 1.0, 0.0),
      vec3<f32>(0.0, 1.0, 0.5),
      vec3<f32>(0.0, 0.5, 1.0),
      vec3<f32>(0.0, 0.0, 1.0),
      vec3<f32>(0.5, 0.0, 1.0),
      vec3<f32>(1.0, 0.0, 0.5)
    );
[[stage(fragment)]]
fn main(
  [[builtin(position)]] fragCoord : vec4<f32>,
  [[location(0)]]  v_uv : vec2<f32>,
  [[location(1)]] normal : vec3<f32>,
  [[location(2)]]  position : vec3<f32>,
  [[location(3)]]  id : u32,
  [[location(4)]]  scenes : u32) -> Output {

    var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  output.Normals=vec4<f32>(normal.xyz, bitcast<f32>(id));


  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(myTexture, mySampler, v_uv);
  //output.Diffuse.w=0.0;


  //DEBUG depth slices
  //let tile : vec3<u32> = getTile(fragCoord.xyz);
  //output.Diffuse = vec4<f32>(colorSet[tile.z % 9u], 0.0);



    let cluster_index = getClusterIndex2(vec4<f32>(fragCoord.xyz, 1.0));
    let cluster_lights_count=clusters_array.lightsCount[cluster_index];
    var color:vec3<f32>=vec3<f32>(0.0,0.0,0.0);

  var shading:f32;
  var shading_rgb:vec3<f32>;
  //TODO, preselect directional lights
    for (var directional_light_pointer_index : u32 = 0u; directional_light_pointer_index < meshes.length; directional_light_pointer_index = directional_light_pointer_index + 1u) {
      let mesh = meshes.mesh[directional_light_pointer_index];
      if((scenes & mesh.scenes) != 0u) {
        //Light reflect from athmosphere
        shading_rgb = shading_rgb + mesh.ambient;
        //Direct sunlight
        shading = shading + max(dot(normal.xyz,mesh.position[12].xyz) * mesh.shadow, 0.0);
      }
    }

    if(cluster_lights_count>0u) {
      for (var light_pointer_index : u32 = 0u; light_pointer_index < cluster_lights_count; light_pointer_index = light_pointer_index + 1u) {
        let light_index:u32 = clusters_array.lights[cluster_index*63u + light_pointer_index];
        let light = meshes.mesh[light_index];
        if((scenes & light.scenes) != 0u) {
          let light_position:vec3<f32> = light.position[12].xyz;

          var light_dir:vec3<f32> = light_position - position.xyz;
          let light_distance_squared= dot(light_dir, light_dir);
          let attenuation = max(1.0 - light_distance_squared / (light.point_light_squared), 0.0);

          shading = shading + max(dot(normal.xyz, normalize(light_dir)),0.0) * attenuation;
        }
      }
    }
    let total_shading=vec3<f32>(shading,shading,shading);
    output.Diffuse= output.Diffuse*max(vec4<f32>(total_shading,1.0),vec4<f32>(shading_rgb,0.0));
     // var tile : vec3<u32> = getTile(fragCoord.xyz);
     // output.Diffuse=vec4<f32>(colorSet[tile.z % 9u],1.0);

  return output;
}

