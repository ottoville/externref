// Non pickable shared single color for all vertices
// TODO: Make actual shading

import type { GPU } from '../../GPU.js';
import { diffuseOutput } from './structs/Structs.js';
import {
  type BufLayout,
  FragmentShaderFunction,
  type ShaderStage,
  FragmentShaderBuilder,
} from '../../webgpu-ts/index.js';

const singleColorFrag = new FragmentShaderFunction<
  [
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {},
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {},
    {
      world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, GPU['meshUniforms']>;
    },
  ]
>(
  diffuseOutput,
  ([
    ,
    ,
    /*{ uniforms, }*/ /*{ scene, clusters_array, meshes, projection, }*/ {
      world,
    },
  ]) => /* wgsl */ `
        var output:Output;
        output.Diffuse = vec4<f32>(${world.prop('color')}, 1.0);
        return output;
  `,
);

export function createSingleColorFragShader(gpu: GPU) {
  const pipelineLayout = gpu.pipelineLayouts.positionAndTimeBindGroup;
  return new FragmentShaderBuilder(
    [pipelineLayout],
    'SingleColor.frag',
  ).addFunction('main', singleColorFrag);
}
