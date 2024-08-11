import type { GPU } from '../../GPU.js';
import { getClusterIndex } from './getClusterIndex.js';
import {
  type Clusters,
  GroundInput,
  diffuseOutput,
} from './structs/Structs.js';
import { pickOutputFragmentFunction } from './Simple.frag.js';
import {
  type BufLayout,
  FragmentShaderFunction,
  type SampLayout,
  ShaderBuilder,
  type ShaderStage,
  type TextLayout,
} from '../../webgpu-ts/index.js';

export function createGroundFragShader(gpu: GPU) {
  const pipelineLayout = gpu.lightsTextureBindGroup;
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new FragmentShaderFunction(
        diffuseOutput,
        (
          [
            ,
            /*{ uniforms, }*/ {
              /*scene,*/ clusters_array,
              meshes /*, projection*/,
            },
            ,
            /*{ world, }*/ { mySampler, diffuseTexture },
          ],
          { v_uv, fragCoord, scenes, normal, position },
        ) => /* wgsl */ `
        var output:Output;

        //  output.Normals=vec4<f32>(normal.xyz, bitcast<f32>(id));
        
          //outPositions=vec4<f32>(position.xyz, 1.0);
          output.Diffuse = textureSample(${diffuseTexture}, ${mySampler}, ${v_uv});
      
            let cluster_index = getClusterIndex(vec4<f32>(${fragCoord}.xyz, 1.0));
            let cluster_lights_count=${clusters_array.prop(
              'lightsCount',
            )}[cluster_index];

            var color:vec3<f32>=vec3<f32>(0.0,0.0,0.0);
        
          var shading:f32;
          var shading_rgb:vec3<f32>;
        
            if(cluster_lights_count>0u) {
              for (var light_pointer_index : u32 = 0u; light_pointer_index < cluster_lights_count; light_pointer_index = light_pointer_index + 1u) {
                let light_index:u32 = ${clusters_array.prop(
                  'lights',
                )}[cluster_index*63u + light_pointer_index];
                let light = ${meshes.prop('mesh')}[light_index];
                if((${scenes} & light.scenes) != 0u) {
                  let light_position:vec3<f32> = light.transformation[3].xyz;
                  if(light.point_light_squared > 0.0) {
                      var light_dir:vec3<f32> = light_position - ${position}.xyz;
                      let light_distance_squared= dot(light_dir, light_dir);
                      let attenuation = max(1.0 - light_distance_squared / (light.point_light_squared), 0.0);
        
                      shading = shading + max(dot(${normal}.xyz, normalize(light_dir)),0.0) * attenuation;
                  } else {
                      //Light reflect from athmosphere
                      shading_rgb = shading_rgb + light.ambient;
                      //Direct sunlight
                      shading = shading + max(dot(${normal}.xyz,light_position) * light.shadow, 0.0);
                  }
                }
              }
            }
            let total_shading=vec3<f32>(shading,shading,shading);
            output.Diffuse= output.Diffuse*max(vec4<f32>(total_shading,1.0),vec4<f32>(shading_rgb,0.0));
            // var tile : vec3<u32> = getTile(fragCoord.xyz);
            // output.Diffuse=vec4<f32>(colorSet[tile.z % 9u],1.0);
        
          return output;
      `,
        GroundInput,
      ) satisfies FragmentShaderFunction<
        [
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            clusters_array: BufLayout<ShaderStage.FRAGMENT, typeof Clusters>;
            meshes: BufLayout<ShaderStage.FRAGMENT, GPU['meshArray']>;
          },
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
            diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
          },
        ]
      >,
    )
    .addFunction('pick', pickOutputFragmentFunction)
    .build(
      'Ground.frag',
      ([
        { screen_dimensions },
        { /*scene, clusters_array, meshes,*/ projection },
        /*{ world, }
      /*{ mySampler, myTexture, }*/
      ]) => /* wgsl */ `
        ${getClusterIndex(screen_dimensions, projection)}

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
`,
    );
}
