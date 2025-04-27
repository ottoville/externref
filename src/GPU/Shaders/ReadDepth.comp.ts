import type { GPU } from '../../GPU.js';
import { Depth_And_Mesh, Mouse } from './structs/Structs.js';

import {
  BGLayout,
  BufLayout,
  ComputeShaderBuilder,
  ComputeShaderFunction,
  PipelineLayout,
  ShaderStage,
  TextLayout,
  textureLoad,
} from '../../webgpu-ts/index.js';

export const depth_and_mesh_buflayout = new BufLayout(
  {
    buffer: {
      hasDynamicOffset: false,
      minBindingSize: 16,
      type: 'storage',
    },
    visibility: ShaderStage.COMPUTE,
  },
  Depth_And_Mesh,
);
const depth_texture_buflayout = new TextLayout(
  {
    texture: {
      multisampled: true,
      sampleType: 'depth',
    },
    visibility: ShaderStage.COMPUTE,
  },
  'texture_depth_multisampled_2d',
);
const mesh_texture_layout = new TextLayout(
  {
    texture: {
      multisampled: false,
      sampleType: 'uint',
    },
    visibility: ShaderStage.COMPUTE,
  },
  'texture_2d<u32>',
);
const mouseBuffLayout = new BufLayout(
  {
    buffer: {
      hasDynamicOffset: false,
      minBindingSize: 8,
      type: 'uniform',
    },
    visibility: ShaderStage.COMPUTE,
  },
  Mouse,
);
export function createReadDepth(gpu: GPU) {
  const bindLayouts = [
    new BGLayout(gpu.device, 'DepthAndMeshLayout', {
      depth_and_mesh: depth_and_mesh_buflayout,
    }),
    new BGLayout(gpu.device, 'DepthTextureLayout', {
      depth_texture: depth_texture_buflayout,
      mesh_texture: mesh_texture_layout,
      mouse: mouseBuffLayout,
    }),
  ] as const;

  const pipelineLayout = new PipelineLayout({
    bindGroupLayouts: bindLayouts,
    label: 'ReadDepthPipeline',
  });
  return [
    bindLayouts,
    new ComputeShaderBuilder([pipelineLayout], 'ReadDepth.comp')
      .addFunction(
        'main',
        new ComputeShaderFunction<
          readonly [
            {
              depth_and_mesh: typeof depth_and_mesh_buflayout;
            },
            {
              depth_texture: typeof depth_texture_buflayout;
              mesh_texture: typeof mesh_texture_layout;
              mouse: typeof mouseBuffLayout;
            },
          ]
        >(
          '@builtin(global_invocation_id) global_id : vec3<u32>',
          [1, 1, 1],
          ([
            { depth_and_mesh },
            { depth_texture, mesh_texture, mouse },
          ]) => /* wgsl */ `
            ${depth_and_mesh.prop('depth')} = ${textureLoad(depth_texture, mouse.prop('position'), 1)};
            ${depth_and_mesh.prop('mesh')} = ${textureLoad(mesh_texture, mouse.prop('position'), 0)}.r;
            ${depth_and_mesh.prop('generation')} = ${textureLoad(mesh_texture, mouse.prop('position'), 0)}.g;
        `,
        ),
      )
      .build(),
  ] as const;
}
