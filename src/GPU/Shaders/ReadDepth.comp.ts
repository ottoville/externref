import type { GPU } from '../../GPU.js';
import { Depth_And_Mesh, Mouse } from './structs/Structs.js';
import type { Engine } from 'engine.js';
import {
  BGLayout,
  BufLayout,
  ComputeShader,
  ComputeShaderFunction,
  PipelineLayout,
  ShaderStage,
  TextLayout,
} from '../../webgpu-ts/index.js';
declare const engine: Engine;

export function createReadDepth(gpu: GPU) {
  const bindLayouts = [
    new BGLayout(gpu.device, 'DepthAndMeshLayout', {
      depth_and_mesh: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 16,
            type: 'storage',
          },
          visibility: ShaderStage.COMPUTE,
        },
        Depth_And_Mesh,
      ),
    }),
    new BGLayout(gpu.device, 'DepthTextureLayout', {
      depth_texture: new TextLayout(
        {
          texture: {
            multisampled: true,
            sampleType: 'depth',
          },
          visibility: ShaderStage.COMPUTE,
        },
        'texture_depth_multisampled_2d',
      ),
      mesh_texture: new TextLayout(
        {
          texture: {
            multisampled: false,
            sampleType: 'uint',
          },
          visibility: ShaderStage.COMPUTE,
        },
        'texture_2d<u32>',
      ),
      mouse: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 8,
            type: 'uniform',
          },
          visibility: ShaderStage.COMPUTE,
        },
        Mouse,
      ),
    }),
  ] as const;

  const pipelineLayout = new PipelineLayout({
    bindGroupLayouts: bindLayouts,
    label: 'ReadDepthPipeline',
  });
  return [
    bindLayouts,
    new ComputeShader({
      entryPoints: {
        main: new ComputeShaderFunction<
          [
            {
              depth_and_mesh: BufLayout<
                ShaderStage.COMPUTE,
                typeof Depth_And_Mesh
              >;
            },
            {
              depth_texture: TextLayout<
                ShaderStage.COMPUTE,
                'texture_depth_multisampled_2d'
              >;
              mesh_texture: TextLayout<ShaderStage.COMPUTE, 'texture_2d<u32>'>;
              mouse: BufLayout<ShaderStage.COMPUTE, typeof Mouse>;
            },
          ]
        >(
          '@builtin(global_invocation_id) global_id : vec3<u32>',
          [1, 1, 1],
          ([
            { depth_and_mesh },
            { depth_texture, mesh_texture, mouse },
          ]) => /* wgsl */ `
                ${depth_and_mesh.prop('depth')} = textureLoad(${
                  depth_texture.variableName
                }, ${mouse.prop('position')}, 1);
                ${depth_and_mesh.prop('mesh')} = textureLoad(${
                  mesh_texture.variableName
                }, ${mouse.prop('position')}, 0).r;
            `,
        ),
      },
      label: 'ReadDepth.comp',
      pipelineLayouts: [pipelineLayout],
    }),
  ] as const;
}
