
struct Mesh {
  position : mat4x4<f32>;
  [[size(16)]] y: f32;  //padding
  ambient : vec3<f32>;
  shadow : f32;
  [[size(20)]] x: f32;  //padding
  point_light : f32;

};
[[block]] struct LightsArray {
  lights_count:u32;
  light: array<u32>;
};
[[block]] struct MeshArray {
  mesh : [[stride(256)]] array<Mesh>;
};
[[block]] struct Uniforms {
  zNear : f32;
  zFar : f32;
  screenDimensions : vec2<f32>;
  
};
[[binding(0), group(0)]] var mySampler: sampler;
[[binding(1), group(0)]] var normalTexture: texture_2d<f32>;
[[binding(2), group(0)]] var positionTexture: texture_2d<f32>;
[[binding(3), group(0)]] var diffuseTexture: texture_2d<f32>;
[[binding(4), group(0)]] var<storage, read> meshes : MeshArray;
[[binding(5), group(0)]] var<storage, read> lights : LightsArray;
[[binding(6), group(0)]] var<uniform> projection : Uniforms;


struct Output {
  [[location(0)]] Color : vec4<f32>;
};

fn linearDepth(depthSample : f32) -> f32 {
  let depthRange : f32 = 2.0 * depthSample - 1.0;
  return 2.0 * projection.zNear * projection.zFar / (projection.zFar + projection.zNear - depthRange * (projection.zFar - projection.zNear));
}

fn getDepthSlice(fragCoordZ : f32) -> u32 {
  // TODO: move to uniform
  let tileCount:vec3<u32>=vec3<u32>(u32(10),u32(10),u32(3));

  // TODO: scale and bias calculation can be moved outside the shader to save cycles.
  let sliceScale : f32 = f32(tileCount.z) / log2(projection.zFar / projection.zNear);
  let sliceBias : f32 = -(f32(tileCount.z) * log2(projection.zNear) / log2(projection.zFar / projection.zNear));
  return u32(max(log2(fragCoordZ) * sliceScale + sliceBias, 0.0));
    // For logarithmic z buffer use linearDepth
  //return u32(max(log2(linearDepth(fragCoordZ)) * sliceScale + sliceBias, 0.0));
}
fn getClusterIndex(pixelCoord:vec3<f32>) -> u32 {
    // TODO: move to uniform
    let tileSizeInPx:f32 = 100.0;
    let numClusters :vec3<u32> = vec3<u32>(u32(100),u32(100),u32(100));

    // Uses equation (3) from Building a Cluster Grid section
    let clusterZVal:u32  = getDepthSlice(pixelCoord.z);

    let clusters: vec3<u32>    = vec3<u32>( vec2<u32>( pixelCoord.xy / tileSizeInPx), clusterZVal);
    let clusterIndex:u32 = clusters.x +
                        numClusters.x * clusters.y +
                        (numClusters.x * numClusters.y) * clusters.z;
    return clusterIndex;
}
fn getTile(fragCoord : vec4<f32>) -> vec3<u32> {
  // TODO: move to uniform
  let tileCount:vec3<u32>=vec3<u32>(u32(100),u32(100),u32(100));

  // TODO: scale and bias calculation can be moved outside the shader to save cycles.
  let sliceScale : f32 = f32(tileCount.z) / log2(projection.zFar / projection.zNear);
  let sliceBias : f32 = -(f32(tileCount.z) * log2(projection.zNear) / log2(projection.zFar / projection.zNear));
  let zTile : u32 = u32(max(log2(fragCoord.z) * sliceScale + sliceBias, 0.0));
  // For logarithmic z buffer use linearDepth
  //let zTile : u32 = u32(max(log2(linearDepth(fragCoord.z)) * sliceScale + sliceBias, 0.0));
  return vec3<u32>(u32(fragCoord.x / (f32(projection.screenDimensions.x) / f32(tileCount.x))),
                   u32(fragCoord.y / (f32(projection.screenDimensions.y) / f32(tileCount.y))),
                   zTile);
}
  let colorSet : array<vec3<f32>, 9> = array<vec3<f32>, 9>(
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
fn main([[location(0)]] uv:vec2<f32>) -> Output {
  var output:Output;
  let sunOffset:u32 = 0u;

  let diffuse:vec4<f32> = textureSample(diffuseTexture, mySampler, uv);
  if(diffuse.w == 0.0) {
    output.Color=vec4<f32>(diffuse.xyz,1.0);
    return output;
  }
  let normal:vec4<f32> = normalize(textureSample(normalTexture, mySampler, uv));
  let normal2:vec3<f32> = textureSample(normalTexture, mySampler, uv).xyz;

  let shadingDun :f32 = dot(normal.xyz,meshes.mesh[sunOffset].position[12].xyz)*meshes.mesh[sunOffset].shadow;
  //output.Color = vec4<f32>(lights.light[sunOffset].ambient + (diffuse.xyz * shadingDun),1.0);
  var frust_position:vec3<f32> = textureSample(positionTexture, mySampler, uv).xyz;
//frust_position.y = frust_position.y - 300.0;
  var shading:f32;
  var color:vec3<f32>=vec3<f32>(0.0,0.0,0.0);
  for (var lightPointerIndex : u32 = 0u; lightPointerIndex < lights.lights_count; lightPointerIndex = lightPointerIndex + 1u) {
      let lightIndex:u32 = lights.light[lightPointerIndex];
      var light:vec3<f32> = meshes.mesh[lightIndex].position[12].xyz;
      //light.y=400.0;

      var lightDir:vec3<f32> = light - frust_position;
      shading = max(dot(normal2.xyz, normalize(lightDir)),0.0);
      color=color+ vec3<f32>(shading, shading, shading);
  }
  //var tile : vec3<u32> = getTile(frust_position);
  //output.Color = vec4<f32>(colorSet[tile.z % 9u], 1.0);
  //output.Color=vec4<f32>(color,1.0);
  let testAmbient=vec3<f32>(0.0,0.0,0.0);
  //output.Color=vec4<f32>(testAmbient+(diffuse.xyz*color),1.0);
  output.Color=vec4<f32>(testAmbient+(vec3<f32>(0.0,1.0,0.0)*color),1.0);

  return output;
}
