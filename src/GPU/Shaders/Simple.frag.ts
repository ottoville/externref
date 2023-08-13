// Pickable single color shader where color is set from vertice
//TODO: Make actual shading to diverse this shader from color.frag

import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from 'GPU.js';
import { getClusterIndex } from './getClusterIndex.js';
import { FragmentShaderFunction } from './ShaderFunction.js';
import {
  diffuseOutput,
  pickOutput,
  pickOutputFragment,
  typicalOutput,
} from './structs/Structs.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];
export function createPickOutputFragment<P extends PipelineLayout>(
  pipelineLayout: P,
) {
  return new FragmentShaderFunction<P['bindGroupLayouts']>(
    pickOutputFragment,
    pipelineLayout,
    pickOutput,
    () =>
      ` var output:PickOutput;
          output.ID = id;
          return output;`,
  );
}
export function createSimpleFragShader(
  pipelineLayout: PipelineLayout<BindLayouts>,
) {
  return new FragmentShader(
    {
      entryPoints: {
        main: new FragmentShaderFunction<
          typeof pipelineLayout.bindGroupLayouts
        >(
          diffuseOutput,
          pipelineLayout,
          typicalOutput,
          ([
            ,
            /*{ uniforms, }*/ {
              /*scene,*/ clusters_array,
              meshes /*projection,*/,
            },
            /*{ world, }*/
          ]) => /* wgsl */ `var output:Output;
              output.Diffuse = vec4<f32>(color,1.0);
            
              //output.Diffuse.w=0.0;
            
            
              //DEBUG depth slices
              //let tile : vec3<u32> = getTile(fragCoord.xyz);
              //output.Diffuse = vec4<f32>(colorSet[tile.z % 9u], 0.0);
            
            
                let cluster_index = getClusterIndex(vec4<f32>(fragCoord.xyz, 1.0));
                let cluster_lights_count=${clusters_array.prop(
                  'lightsCount',
                )}[cluster_index];
            
              var shading:f32;
              var shading_rgb:vec3<f32>;
            
                if(cluster_lights_count>0u) {
                  for (var light_pointer_index : u32 = 0u; light_pointer_index < cluster_lights_count; light_pointer_index = light_pointer_index + 1u) {
                    let light_index:u32 = ${clusters_array.prop(
                      'lights',
                    )}[cluster_index*63u + light_pointer_index];
                    let light = ${meshes.prop('mesh')}[light_index];
                    if((scenes & light.scenes) != 0u) {
                      let light_position:vec3<f32> = light.transformation[3].xyz;
                      if(light.point_light_squared > 0.0) {
                          var light_dir:vec3<f32> = light_position - position.xyz; // this is vec3<f32>(0.0,0.0,0.0)
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
              return output;`,
        ),
        pick: createPickOutputFragment(pipelineLayout),
      },
      gpu: pipelineLayout.gpu,
      label: 'Simple.frag',
    },
    ([
      { screen_dimensions },
      { /*scene, clusters_array, meshes,*/ projection },
      /*{ world, }*/
    ]) =>
      `
      ${getClusterIndex(screen_dimensions, projection)}
    `,
  );
}

export type SimpleFragShader = ReturnType<typeof createSimpleFragShader>;
