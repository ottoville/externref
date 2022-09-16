#import "mesh.export.wgsl"

struct MeshArray {
  length:u32,
  pointers: array<u32, 63>,
  mesh: array<MeshUniforms>
};
struct Lights {
  length:u32,
  pointers: array<u32>
};
struct ViewUniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};
struct ClusterBounds {
  minAABB : vec4<f32>,
  maxAABB : vec4<f32>
};
struct Clusters {
  bounds: array<ClusterBounds, 27648>, //32 * 18 * 48 = total tiles = 27648
  lightsCount: array<u32, 27648>,
  lights: array<u32, 1741824>  //27648 * 63 = 1741824
};

@binding(0) @group(0) var<storage, read> meshes : MeshArray;
@binding(1) @group(0) var<storage, read> point_lights : Lights;
@binding(2) @group(0) var<storage, read> directional_lights : Lights;
@binding(0) @group(1) var<storage, read_write> clusters : Clusters;
@binding(1) @group(1) var<uniform> viewUniforms : ViewUniforms;



  fn sqDistPointAABB(position : vec3<f32>, minAABB : vec3<f32>, maxAABB : vec3<f32>) -> f32 {
    var sqDist = 0.0;
    // const minAABB : vec3<f32> = clusters.bounds[tileIndex].minAABB;
    // const maxAABB : vec3<f32> = clusters.bounds[tileIndex].maxAABB;

    // Wait, does this actually work? Just porting code, but it seems suspect?
    for(var i = 0; i < 3; i = i + 1) {
      let v = position[i];
      if(v < minAABB[i]){
        sqDist = sqDist + (minAABB[i] - v) * (minAABB[i] - v);
      }
      if(v > maxAABB[i]){
        sqDist = sqDist + (v - maxAABB[i]) * (v - maxAABB[i]);
      }
    }

    return sqDist;
  }
const tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);

@compute @workgroup_size(4, 2, 4)
fn main(
    @builtin(global_invocation_id) global_id : vec3<u32>
) {

  let tileIndex = global_id.x +
                  global_id.y * tileCount.x +
                  global_id.z * tileCount.x * tileCount.y;

  
  var lightCount=0u;
  for(var pointerIndex:u32=0u; pointerIndex < directional_lights.length; pointerIndex = pointerIndex + 1u) {
    let meshIndex = directional_lights.pointers[pointerIndex];
    let mesh=meshes.mesh[meshIndex];
    clusters.lights[tileIndex*63u + lightCount] = meshIndex;
    lightCount=lightCount+1u;
    if(lightCount==63u) {
      break;
    }
  }
  let cluster=clusters.bounds[tileIndex];
  for(var pointerIndex:u32=0u; pointerIndex < point_lights.length; pointerIndex = pointerIndex + 1u) {
    let meshIndex = point_lights.pointers[pointerIndex];
    let mesh=meshes.mesh[meshIndex];
    // TODO: Preselect lights with CPU
    let lightViewPos = viewUniforms.view * vec4<f32>(mesh.transformation[3].xyz, 1.0);
    let sqDist = sqDistPointAABB(lightViewPos.xyz, cluster.minAABB.xyz, cluster.maxAABB.xyz);

    if (sqDist <= mesh.point_light_squared) {
      // Light affects this cluster. Add it to the list.
      clusters.lights[tileIndex*63u + lightCount] = meshIndex;
      lightCount=lightCount+1u;
      //TODO: lightCount might already be max because of directional lights
      if(lightCount==63u) {
        break;
      }
    }

  }
  clusters.lightsCount[tileIndex] = lightCount;
}
