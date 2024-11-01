import type { GPU } from '../../../GPU.js';
import { getClusterIndex } from '../getClusterIndex.js';
import {
  FragmentShaderBuilder,
  FragmentShaderFunction,
} from '../../../webgpu-ts/index.js';
import { diffuseOutput, fragOutput } from '../structs/Structs.js';

const depthSlicesFrag = new FragmentShaderFunction(
  diffuseOutput,
  (_, { fragCoord }) => /* wgsl */ `
var output:Output;

  //DEBUG depth slices
  let tile : vec3<u32> = getTile(${fragCoord}.xyz);
  output.Diffuse = vec4<f32>(colorSet[tile.z % 9u], 1.0);

  return output;
`,
  fragOutput,
);
export function createDebugDepthSlicesFragShader(gpu: GPU) {
  return new FragmentShaderBuilder(
    [
      gpu.pipelineLayouts.lightsTextureBindGroup,
      gpu.pipelineLayouts.positionAndTimeBindGroup,
    ],
    'DebugDepthSlicesFragShader.frag',
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
  ).addFunction('debug_depth_slices', depthSlicesFrag);
}
