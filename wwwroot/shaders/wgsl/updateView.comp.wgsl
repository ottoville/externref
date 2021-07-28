
struct Meshes {
  position : mat4x4<f32>;
  [[size(52)]] y: f32;  //padding
  point_light : f32;
};
[[block]] struct MeshArray {
  length:u32;
  pointers: array<u32, 255>;
  mesh : [[stride(256)]] array<Meshes>;
};

[[block]] struct Uniforms {
  zNear : f32;
  zFar : f32;
  screenDimensions : vec2<f32>;
};
[[block]] struct ViewUniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
  view : mat4x4<f32>;
  viewPosition : vec3<f32>;
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
  lights: [[stride(252)]] array<u32, 27648>;  //27648 * 63 = 1741824
};

//[[block]] struct ClusterLightGroup {
  //offset : atomic<u32>;
  //lights : [[stride(256)]] array<ClusterLights, 27648>; //32 * 18 * 48 = total tiles = 27648
  //indices : [[stride(4)]] array<u32, 1741824>; //${MAX_LIGHTS_PER_CLUSTER * TOTAL_TILES}>; 63*27648
//};

[[binding(0), group(0)]] var<storage, read> meshes : MeshArray;
[[binding(1), group(0)]] var<storage, read_write> clusters : Clusters;
[[binding(0), group(1)]] var<uniform> viewUniforms : ViewUniforms;



  fn sqDistPointAABB(point : vec3<f32>, minAABB : vec3<f32>, maxAABB : vec3<f32>) -> f32 {
    var sqDist = 0.0;
    // const minAABB : vec3<f32> = clusters.bounds[tileIndex].minAABB;
    // const maxAABB : vec3<f32> = clusters.bounds[tileIndex].maxAABB;
    // Wait, does this actually work? Just porting code, but it seems suspect?
    for(var i = 0; i < 3; i = i + 1) {
      let v = point[i];
      if(v < minAABB[i]){
        sqDist = sqDist + (minAABB[i] - v) * (minAABB[i] - v);
      }
      if(v > maxAABB[i]){
        sqDist = sqDist + (v - maxAABB[i]) * (v - maxAABB[i]);
      }
    }
    return sqDist;
  }

[[stage(compute), workgroup_size(4, 2, 4)]]
fn main(
    [[builtin(global_invocation_id)]] global_id : vec3<u32>
) {
  let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);

  let tileIndex = global_id.x +
                  global_id.y * tileCount.x +
                  global_id.z * tileCount.x * tileCount.y;

  //var clusterLightCount = 0u;
  var cluserLightIndices : array<u32, 63>;
  //TODO: precompute on CPU
  let maxLightCount=min(meshes.length, 62u);
  let cluster=clusters.bounds[tileIndex];
  var clusterCounts=clusters.lightsCount[tileIndex];

  var lightCount=0u;
  var lights:LightsArray;
  for(var pointerIndex:u32=0u; pointerIndex < maxLightCount; pointerIndex = pointerIndex + 1u) {
    let meshIndex = meshes.pointers[pointerIndex];
    var range = meshes.mesh[meshIndex].point_light;
    if(range > 0.0) {
      range=9000.0;
      let lightViewPos = viewUniforms.view * vec4<f32>(meshes.mesh[meshIndex].position[12].xyz, 1.0);
      let sqDist = sqDistPointAABB(lightViewPos.xyz, cluster.minAABB, cluster.maxAABB);
      var lightInCluster = sqDist <= (range * range);
      if (lightInCluster) {
        // Light affects this cluster. Add it to the list.
        clusters.lights[tileIndex*63u + lightCount] = meshIndex;
        lightCount=lightCount+1u;
      }
    }
    
    //var offset = atomicAdd(&clusterLights.offset, clusterLightCount);
    //for(var i = 0u; i < clusterLightCount; i = i + 1u) {
    //  clusterLights.indices[offset + i] = cluserLightIndices[i];
    //}
  }
  clusters.lightsCount[tileIndex] = lightCount;
}
