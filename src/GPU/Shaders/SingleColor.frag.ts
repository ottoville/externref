// Non pickable shared single color for all vertices
// TODO: Make actual shading

import type { GPU } from '../../GPU.js';
import { MeshUniforms, diffuseOutput } from './structs/Structs.js';
import {
  type BufLayout,
  FragmentShaderFunction,
  type ShaderStage,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';

const singleColorFrag = new FragmentShaderFunction<
  [
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    {
      world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
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

export function createSingleColorFragShader(
  pipelineLayout: GPU['shaders']['positionAndTimeBindGroup'],
) {
  return new ShaderBuilder([pipelineLayout])
    .addFunction('main', singleColorFrag)
    .build('SingleColor.frag');
}
