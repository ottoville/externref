import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import { GPU } from 'GPU.js'

type BindLayouts = GPU["lightsBindGroupTexture2"]["bindGroupLayouts"]


export class GroundFragShader extends FragmentShader<
    { main: PipelineLayout, pick: PipelineLayout }, BindLayouts> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout,
                pick: pipelineLayout
            },
            label: 'Ground.frag',
        });
        this.createWGSL((
            [uniforms],
            [/*scene*/, clusters_array, meshes, projection],
            [/*world*/,],
            [mySampler, myTexture]) => {
            //////////////////////////////////
            return /* wgsl */ `
struct Output {
  @location(0) Diffuse : vec4<f32>
};
struct OutputPick {
  @location(0) ID : u32
};

fn linearDepth(depthSample : f32) -> f32 {
  return projection.z_near_multiplied_far / fma(depthSample, ${projection.variableName}.z_near_substracted_far, ${projection.variableName}.zNear);
}
fn getTile(fragCoord : vec3<f32>) -> vec3<u32> {
  // TODO: move to uniform
  let tileCount : vec3<f32> = vec3<f32>(32.0, 18.0, 48.0);
  
  //TODO: zTile lookup can be hardcoded for speed
  let zTile : u32 = u32(max(fma(log2(linearDepth(fragCoord.z)),${projection.variableName}.slice_scale,${projection.variableName}.slice_bias), 0.0));
  let pos: vec2<f32> = fragCoord.xy / ${uniforms.variableName}.screendimensions_ratio;
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
@fragment
fn main(
  @builtin(position) fragCoord : vec4<f32>,
  @location(0)  v_uv : vec2<f32>,
  @location(1) normal : vec3<f32>,
  @location(2)  position : vec3<f32>,
  @location(3) @interpolate(flat)  id : u32,
  @location(4) @interpolate(flat)  scenes : u32) -> Output {

    var output:Output;

//  output.Normals=vec4<f32>(normal.xyz, bitcast<f32>(id));

  //outPositions=vec4<f32>(position.xyz, 1.0);
  output.Diffuse = textureSample(${myTexture.variableName}, ${mySampler.variableName}, v_uv);
  //output.Diffuse.w=0.0;


  //DEBUG depth slices
  //let tile : vec3<u32> = getTile(fragCoord.xyz);
  //output.Diffuse = vec4<f32>(colorSet[tile.z % 9u], 0.0);



    let cluster_index = getClusterIndex2(vec4<f32>(fragCoord.xyz, 1.0));
    let cluster_lights_count=${clusters_array.variableName}.lightsCount[cluster_index];
    var color:vec3<f32>=vec3<f32>(0.0,0.0,0.0);

  var shading:f32;
  var shading_rgb:vec3<f32>;

    if(cluster_lights_count>0u) {
      for (var light_pointer_index : u32 = 0u; light_pointer_index < cluster_lights_count; light_pointer_index = light_pointer_index + 1u) {
        let light_index:u32 = ${clusters_array.variableName}.lights[cluster_index*63u + light_pointer_index];
        let light = ${meshes.variableName}.mesh[light_index];
        if((scenes & light.scenes) != 0u) {
          let light_position:vec3<f32> = light.transformation[3].xyz;
          if(light.point_light_squared > 0.0) {
              var light_dir:vec3<f32> = light_position - position.xyz;
              let light_distance_squared= dot(light_dir, light_dir);
              let attenuation = max(1.0 - light_distance_squared / (light.point_light_squared), 0.0);

              shading = shading + max(dot(normal.xyz, normalize(light_dir)),0.0) * attenuation;
          } else {
              //Light reflect from athmosphere
              shading_rgb = shading_rgb + light.ambient;
              //Direct sunlight
              shading = shading + max(dot(normal.xyz,light_position) * light.shadow, 0.0);
          }
        }
      }
    }
    let total_shading=vec3<f32>(shading,shading,shading);
    output.Diffuse= output.Diffuse*max(vec4<f32>(total_shading,1.0),vec4<f32>(shading_rgb,0.0));
     // var tile : vec3<u32> = getTile(fragCoord.xyz);
     // output.Diffuse=vec4<f32>(colorSet[tile.z % 9u],1.0);

  return output;
}
@fragment
fn pick(
  @builtin(position) fragCoord : vec4<f32>,
  @location(0) @interpolate(flat)  id : u32) -> OutputPick {

    var output:OutputPick;
    output.ID=id;
    return output;

  }
  `;
            //////////////
        });
    }
}