
struct Mesh {
  position : mat4x4<f32>;
  [[size(16)]] y: f32;  //padding
  ambient : vec3<f32>;
  shadow : f32;
  [[size(20)]] x: f32;  //padding
  point_light : f32;

};
[[block]] struct LightsArray_deprecated {
  lights_count:u32;
  light: array<u32>;
};
[[block]] struct MeshArray {
  length:u32;
  pointers: array<u32, 63>;
  mesh : [[stride(256)]] array<Mesh>;
};
[[block]] struct Uniforms {
  zNear : f32;
  zFar : f32;
  screenDimensions : vec2<f32>;
};
struct LightsArray {
  count:u32;
  lightPointers: array<u32, 63>;
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
[[binding(0), group(0)]] var normalTexture: texture_2d<f32>;
[[binding(1), group(0)]] var positionTexture: texture_2d<f32>;
[[binding(2), group(0)]] var diffuseTexture: texture_2d<f32>;
[[binding(3), group(0)]] var<storage, read> meshes : MeshArray;
[[binding(4), group(0)]] var<storage, read> lights : LightsArray_deprecated;



struct Output {
  [[location(0)]] Color : vec4<f32>;
};

[[stage(fragment)]]
fn main([[builtin(position)]] fragCoord : vec4<f32>) -> Output {

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
  let sunOffset:u32 = 0u;
  let fragCoordI=vec2<i32>(round(fragCoord.xy));

  let diffuse:vec4<f32> = textureLoad(diffuseTexture, fragCoordI, 0);



  //let clusterIndex = getClusterIndex2(vec4<f32>(fragCoord.xy, normal.w, 1.0));
  //let cluster=clustersArray.bounds[clusterIndex];
  //let clusterLightsCount=clustersArray.lightsCount[clusterIndex];
  //let clusterLights=clustersArray.lights[clusterIndex];

  //for (var lightPointerIndex : u32 = 0u; lightPointerIndex < clusterLightsCount; lightPointerIndex = lightPointerIndex + 1u) {
  //    let lightIndex:u32 = clustersArray.lights[clusterIndex*63u + lightPointerIndex];
  //    var light:vec3<f32> = meshes.mesh[lightIndex].position[12].xyz;

  //    var lightDir:vec3<f32> = light - frust_position;
  //    shading = max(dot(normal.xyz, normalize(lightDir)),0.0);
  //    color=color+ vec3<f32>(shading, shading, shading);
  //}
  //output.Color=vec4<f32>(color,1.0);
  output.Color=vec4<f32>(diffuse.xyz,1.0);


  //DEBUG depth slices
  //let tile : vec3<u32> = getTile(vec3<f32>(fragCoord.xy,normal.w));
  //output.Color = vec4<f32>(colorSet[tile.z % 9u], 1.0);

  //DEBUG distance

//    let midPoint : vec3<f32> = (clustersArray.bounds[clusterIndex].maxAABB - clustersArray.bounds[clusterIndex].minAABB) / vec3<f32>(2.0, 2.0, 2.0);
//    let center : vec3<f32> = clustersArray.bounds[clusterIndex].minAABB + midPoint;
//    let radius : f32 = length(midPoint);

//    let fragToBoundsCenter : vec3<f32> = frust_position - center;
//    let distToBoundsCenter : f32 = length(fragToBoundsCenter);
//    let normDist : f32 = distToBoundsCenter / radius;

  return output;
}
