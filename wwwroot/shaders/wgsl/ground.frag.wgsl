//[[location(0)]] var<out> outColor : vec4<f32>;
struct Output {
  [[location(0)]] Normals : vec4<f32>;
  [[location(1)]] Positions : vec4<f32>;
  [[location(2)]] Diffuse : vec4<f32>;
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
  [[location(3)]]  id : u32,
  [[location(4)]]  viewPosition : vec3<f32>) -> Output {

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
    //if(clusterLightsCount>0u) {
    //  output.Diffuse = vec4<f32>(1.0, 0.0, 0.0, 0.0);
    //}
  //DEBUG distance

    let midPoint : vec3<f32> = (clustersArray.bounds[clusterIndex].maxAABB - clustersArray.bounds[clusterIndex].minAABB) / vec3<f32>(2.0, 2.0, 2.0);
    let center : vec3<f32> = clustersArray.bounds[clusterIndex].minAABB + midPoint;
    let radius : f32 = length(midPoint);

    let fragToBoundsCenter : vec3<f32> = viewPosition.xyz - center;
    let distToBoundsCenter : f32 = length(fragToBoundsCenter);
    let normDist : f32 = distToBoundsCenter / radius;

    //output.Diffuse = vec4<f32>(normDist, normDist, normDist, 0.0);

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