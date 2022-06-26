struct Mesh {
  position : mat4x4<f32>,
  @size(16) y: f32,  //padding
  ambient : vec3<f32>,
  shadow : f32,
  @size(20) x: f32,  //padding
  point_light : f32

};

struct Uniforms {
  zNear : f32,
  zFar : f32,
  screenDimensions : vec2<f32>
};
struct LightsArray {
  count:u32,
  lightPointers: array<u32, 63>
};
struct ClusterBounds {
  minAABB : vec3<f32>,
  maxAABB : vec3<f32>
};
struct Clusters {
  bounds: array<ClusterBounds, 27648>, //32 * 18 * 48 = total tiles = 27648
  lightsCount: array<u32, 27648>,
  lights: array<u32, 1741824>  //27648 * 63 = 1741824
};

@binding(0) @group(0) var diffuseTexture: texture_2d<f32>;

struct Output {
  @location(0) Color : vec4<f32>
};

@fragment
fn main(@builtin(position) fragCoord : vec4<f32>) -> Output {

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
  let fragCoordI=vec2<i32>(floor(fragCoord.xy));

  let diffuse:vec4<f32> = textureLoad(diffuseTexture, fragCoordI, 0);
 // let normal:vec3<f32> = textureLoad(normalTexture, fragCoordI, 0).xyz;



  //let clusterIndex = getClusterIndex2(vec4<f32>(fragCoord.xy, normal.w, 1.0));
  //let cluster=clustersArray.bounds[clusterIndex];
  //let clusterLightsCount=clustersArray.lightsCount[clusterIndex];
  //let clusterLights=clustersArray.lights[clusterIndex];
//  var shading:f32;
  //var shading_rgb:vec3<f32>;

 // for (var lightPointerIndex : u32 = 0u; lightPointerIndex < directional_lights.length; lightPointerIndex = lightPointerIndex + 1u) {
   //   let lightIndex:u32 = directional_lights.pointers[lightPointerIndex];
    //  var light:Mesh = meshes.mesh[lightIndex];



      //Light reflect from athmosphere
      //shading_rgb = shading_rgb + light.ambient;
      //Direct sunlight
      //shading = shading + max(dot(normal.xyz,light.position[12].xyz) * light.shadow, 0.0);
  //}
  //let total_shading=shading_rgb+vec3<f32>(shading,shading,shading);
  //output.Color=vec4<f32>(color,1.0);
  output.Color=vec4<f32>(diffuse.xyz,1.0);

  return output;
}
