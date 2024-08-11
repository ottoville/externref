import type { BufLayout, ShaderStage } from '../../webgpu-ts/index.js';
import {
  tileCount,
  type ProjectionStruct,
  type ScreenDimensions,
} from './structs/Structs.js';

export const getClusterIndex = (
  screen_dimensions: BufLayout<number, typeof ScreenDimensions>,
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
        let tile = getTile(fragCoord.xyz);
        return tile.x +
               tile.y * ${tileCount[0]} +
               tile.z * ${tileCount[0]} * ${tileCount[1]};
      }
`;
