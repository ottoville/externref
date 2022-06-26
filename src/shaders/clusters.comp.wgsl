//ssbo initialization
 struct VolumeTileAABB {
  minPoint : vec3<f32>,
  maxPoint : vec3<f32>
};
struct clusterArray {
  bounds: array<VolumeTileAABB,27648>, //32 * 18 * 48 = total tiles = 27648
  lightsCount: array<u32, 27648>,
  lights: array<u32, 1741824>  //27648 * 63 = 1741824
};

struct Projection {
  inversed_projection : mat4x4<f32>,
  reversed_projection:mat4x4<f32>,
  inversed_projection_farplane:mat4x4<f32>,
  zNear : f32,
  zFar : f32
};

struct Uniforms {
  screenDimensions : vec2<f32>
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var<storage, write> clusters : clusterArray;
@group(1) @binding(1) var<uniform> screentoview : Projection;

 fn clipToView(clip : vec4<f32>) -> vec4<f32> {
   //View space transform
    let view = screentoview.inversed_projection * clip;
     //Perspective projection
    return view / view.w;
  }

  fn screen2View(screen : vec4<f32>) -> vec4<f32> {
     //Convert to NDC
    let texCoord = screen.xy /  uniforms.screenDimensions;
        //Convert to clipSpace

    let clip = vec4<f32>(vec2<f32>(texCoord.x, 1.0 - texCoord.y) * 2.0 - 1.0, screen.z, screen.w);

    //Not sure which of the two it is just yet
    return clipToView(clip);
  }

//Creates a line from the eye to the screenpoint, then finds its intersection
//With a z oriented plane located at the given distance to the origin
  fn lineIntersectionToZPlane(a : vec3<f32>, b : vec3<f32>, zDistance : f32) -> vec3<f32> {
    //Because this is a Z based normal this is fixed
    let normal = vec3<f32>(0.0, 0.0, 1.0);
    let ab = b - a;
    //Computing the intersection length for the line and the plane
    let t = (zDistance - dot(normal, a)) / dot(normal, ab);
    //Computing the actual xyz position of the point along the line
    return a + t * ab;
  }

//Eye position is zero in view space
 let eyePos = vec3<f32>(0.0, 0.0, 0.0);

 //let tileCount : vec3<u32> = vec3<u32>(1u, 1u, 1u);
 let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);
@compute @workgroup_size(4,2,4)
  fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let tileIndex = global_id.x +
                    global_id.y * tileCount.x +
                    global_id.z * tileCount.x * tileCount.y;
    let tileSize = vec2<f32>(uniforms.screenDimensions.x / f32(tileCount.x),
                             uniforms.screenDimensions.y / f32(tileCount.y));
    //Calculating the min and max point in screen space

    let maxPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x+1u), f32(global_id.y+1u)) * tileSize, 1.0, 1.0);
    let minPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x), f32(global_id.y)) * tileSize, 1.0, 1.0);
    //Pass min and max to view space
    let maxPoint_vS = screen2View(maxPoint_sS).xyz;
    let minPoint_vS = screen2View(minPoint_sS).xyz;
    //Near and far values of the cluster in view space
    let tileNear = -screentoview.zNear * pow(screentoview.zFar/ screentoview.zNear, f32(global_id.z)/f32(tileCount.z));
    let tileFar = -screentoview.zNear * pow(screentoview.zFar/ screentoview.zNear, f32(global_id.z+1u)/f32(tileCount.z));
    //Finding the 4 intersection points made from the maxPoint to the cluster near/far plane
    let minPointNear = lineIntersectionToZPlane(eyePos, minPoint_vS, tileNear);
    let minPointFar = lineIntersectionToZPlane(eyePos, minPoint_vS, tileFar);
    let maxPointNear = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileNear);
    let maxPointFar = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileFar);
    //Getting the 
    clusters.bounds[tileIndex].minPoint = min(min(minPointNear, minPointFar),min(maxPointNear, maxPointFar));
    clusters.bounds[tileIndex].maxPoint = max(max(minPointNear, minPointFar),max(maxPointNear, maxPointFar));
}



