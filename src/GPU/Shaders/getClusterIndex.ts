import type { BufLayout, ShaderStage } from '../BindGroupLayout.js';
import type { ProjectionStruct, Struct } from './structs/Structs.js';

export const getClusterIndex = (
  screen_dimensions: BufLayout<
    number,
    Struct<{
      screenDimensions: readonly [string, string];
      screendimensions_ratio: readonly [string, string];
    }>
  >,
  projection: BufLayout<ShaderStage.FRAGMENT, typeof ProjectionStruct>,
) => /* wgsl */ `
    fn linearDepth(depthSample : f32) -> f32 {
        return ${projection.prop(
          'z_near_multiplied_far',
        )} / fma(depthSample, ${projection.prop(
          'z_near_substracted_far',
        )}, ${projection.prop('zNear')});
    }

    fn getTile(fragCoord : vec3<f32>) -> vec3<u32> {
        // TODO: move to uniform
        let tileCount : vec3<f32> = vec3<f32>(32.0, 18.0, 48.0);
        
        //TODO: zTile lookup can be hardcoded for speed
        let zTile : u32 = u32(max(fma(log2(linearDepth(fragCoord.z)),${projection.prop(
          'slice_scale',
        )},${projection.prop('slice_bias')}), 0.0));
        let pos: vec2<f32> = fragCoord.xy / ${screen_dimensions.prop(
          'screendimensions_ratio',
        )};
        return vec3<u32>(u32(pos.x),u32(pos.y),zTile);
    }

    fn getClusterIndex(fragCoord : vec4<f32>) -> u32 {
        let tileCount : vec3<u32> = vec3<u32>(32u, 18u, 48u);
      
        let tile = getTile(fragCoord.xyz);
        return tile.x +
               tile.y * tileCount.x +
               tile.z * tileCount.x * tileCount.y;
      }
`;
