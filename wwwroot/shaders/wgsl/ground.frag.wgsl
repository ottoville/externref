//[[location(0)]] var<out> outColor : vec4<f32>;
struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Positions : vec4<f32>;
  [[location(2)]] Diffuse : vec4<f32>;
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
[[block]] struct Uniforms {
  zNear : f32;
  zFar : f32;
  screenDimensions : vec2<f32>;
  projection:mat4x4<f32>;
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
[[binding(2), group(0)]] var<storage, read> clustersArray : Clusters;
[[binding(3), group(0)]] var<uniform> projection : Uniforms;
[[binding(4), group(0)]] var<storage, read> meshes : MeshArray;

[[binding(0), group(2)]] var mySampler: sampler;
[[binding(1), group(2)]] var myTexture: texture_2d<f32>;

fn linearDepth(depthSample : f32) -> f32 {
  let depthRange : f32 = 2.0 * depthSample - 1.0;
  return 2.0 * projection.zNear * projection.zFar / (projection.zFar + projection.zNear - depthRange * (projection.zFar - projection.zNear));
}
fn getTile(fragCoord : vec3<f32>) -> vec3<u32> {
  // TODO: move to uniform
  let tileCount : vec3<f32> = vec3<f32>(32.0, 18.0, 48.0);

  // TODO: scale and bias calculation can be moved outside the shader to save cycles.
  let sliceScale = tileCount.z / log2(projection.zFar / projection.zNear);
  let sliceBias = -(tileCount.z * log2(projection.zNear) / log2(projection.zFar / projection.zNear));
  //let zTile = u32(max(log2(fragCoord.z) * sliceScale + sliceBias, 0.0));
  // For logarithmic z buffer use linearDepth
  let zTile : u32 = u32(max(log2(linearDepth(fragCoord.z)) * sliceScale + sliceBias, 0.0));
  let pos: vec2<f32> = fragCoord.xy / (projection.screenDimensions / tileCount.xy);
  return vec3<u32>(u32(pos.x),u32(pos.y),zTile);

  //return vec3<u32>(u32(fragCoord.x / (f32(projection.screenDimensions.x) / f32(tileCount.x))),
   //                u32(fragCoord.y / (f32(projection.screenDimensions.y) / f32(tileCount.y))),
   //                zTile);
}
fn getClusterIndex2(fragCoord : vec4<f32>) -> u32 {
  let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);

  let tile = getTile(fragCoord.xyz);
  return tile.x +
         tile.y * tileCount.x +
         tile.z * tileCount.x * tileCount.y;
}
[[stage(fragment)]]
fn main(
  [[builtin(position)]] fragCoord : vec4<f32>,
  [[location(0)]]  v_uv : vec2<f32>,
  [[location(1)]] normal : vec3<f32>,
  [[location(2)]]  position : vec3<f32>,
  [[location(3)]]  id : u32,) -> Output {

  var colorSet : array<vec3<f32>, 9> = array<vec3<f32>, 9>(
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

    var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  output.Normals=vec4<f32>(normal.xyz, fragCoord.z);

  output.Positions=vec4<f32>(position, bitcast<f32>(id));

  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(myTexture, mySampler, v_uv);
  //output.Diffuse.w=0.0;


  //DEBUG depth slices
  //let tile : vec3<u32> = getTile(fragCoord.xyz);
  //output.Diffuse = vec4<f32>(colorSet[tile.z % 9u], 0.0);



    let clusterIndex = getClusterIndex2(vec4<f32>(fragCoord.xyz, 1.0));
    let clusterLightsCount=clustersArray.lightsCount[clusterIndex];
    var color:vec3<f32>=vec3<f32>(0.0,0.0,0.0);

  var shading:f32;
  var shading_rgb:vec3<f32>;
  //TODO, preselect directional lights
    for (var directionalLightPointerIndex : u32 = 0u; directionalLightPointerIndex < meshes.length; directionalLightPointerIndex = directionalLightPointerIndex + 1u) {
      let mesh = meshes.mesh[directionalLightPointerIndex];
      if(mesh.directional_light > 0.0) {
          //Light reflect from athmosphere
          shading_rgb = shading_rgb + mesh.ambient;
          //Direct sunlight
          shading = shading + max(dot(normal.xyz,mesh.position[12].xyz) * mesh.shadow, 0.0);
      }
    }

    if(clusterLightsCount>0u) {
      for (var lightPointerIndex : u32 = 0u; lightPointerIndex < clusterLightsCount; lightPointerIndex = lightPointerIndex + 1u) {
        let lightIndex:u32 = clustersArray.lights[clusterIndex*63u + lightPointerIndex];
        let light = meshes.mesh[lightIndex];
        let light_position:vec3<f32> = light.position[12].xyz;

        var lightDir:vec3<f32> = light_position - position.xyz;
        let light_distance_squared= dot(lightDir, lightDir);
        let attenuation = max(1.0 - light_distance_squared / (light.point_light_squared), 0.0);

        shading = shading + max(dot(normal.xyz, normalize(lightDir)),0.0) * attenuation;
      }
    }
    let total_shading=shading_rgb+vec3<f32>(shading,shading,shading);
    output.Diffuse= output.Diffuse*vec4<f32>(total_shading,1.0);
  return output;
}

[[stage(fragment)]]
fn normals(
  [[builtin(position)]] fragCoord : vec4<f32>,
  [[location(0)]]  v_uv : vec2<f32>,
  [[location(1)]] normal : vec3<f32>,
  [[location(2)]]  position : vec3<f32>,
  [[location(3)]]  id : u32) -> Output {
    var output:Output;
  //outColor = vec4<f32>(ambient,0.0)+textureSample(myTexture, mySampler, v_uv) *  vec4<f32>(shading,shading,shading,1.0);
  //outColor.w=1.0;
  output.Normals=vec4<f32>(normal.xyz, 1.0);

  output.Positions=vec4<f32>(position.xyz, bitcast<f32>(id));

  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(myTexture, mySampler, v_uv);
 // output.Diffuse.r=1.0;
 // output.Diffuse.g=0.0;
 // output.Diffuse.b=0.0;
 // output.Diffuse.w=0.0;
  //  output.Diffuse = vec4<f32>(1.0, 0.0, 0.0, 0.0);

  return output;
}