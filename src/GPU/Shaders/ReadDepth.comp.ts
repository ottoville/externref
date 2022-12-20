import { BindGroupLayout2, GPUBindGroupLayoutEntryBuffer, GPUBindGroupLayoutEntryTexture } from '../BindGroupLayout2.js'
import { PipelineLayout2 } from '../PipelineLayout2.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js'
export class ReadDepth extends ComputeShader<
    [BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>, BindGroupLayout2<[GPUBindGroupLayoutEntryTexture, GPUBindGroupLayoutEntryTexture, GPUBindGroupLayoutEntryBuffer]>],
    { main: PipelineLayout2 }> {
    entryPoints: { main: PipelineLayout2; };
    module: GPUShaderModule;
    constructor(gpu: GPU) {
        const bindLayouts = [
            new BindGroupLayout2(gpu, 'DepthAndMeshLayout',
                {
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                        hasDynamicOffset: false,
                        minBindingSize: 16
                    }
                }
            ),
            new BindGroupLayout2(gpu, 'DepthTextureLayout',
                {
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        multisampled: true,
                        sampleType: 'depth'
                    }
                },
                {
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        multisampled: false,
                        sampleType: 'uint'
                    }
                },
                {
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform',
                        hasDynamicOffset: false,
                        minBindingSize: 8
                    }
                }
            )
        ] as const;
        super(gpu, bindLayouts);
        /////////////////
        const wgsl = /* wgsl */ `
    
struct Depth_And_Mesh {
    depth:f32,
    mesh:u32
  };
  
  struct Mouse {
    position:vec2<i32>
  };
  ${this.groups[0]![0]} depth_and_mesh : Depth_And_Mesh;
  ${this.groups[1]![0]} depth_texture : texture_depth_multisampled_2d;
  ${this.groups[1]![1]} mesh_texture : texture_2d<u32>;
  ${this.groups[1]![2]} mouse : Mouse;
  
  @compute @workgroup_size(1, 1, 1)
  fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
  ) {
  
      depth_and_mesh.depth=textureLoad(depth_texture, mouse.position, 1);
      depth_and_mesh.mesh=textureLoad(mesh_texture, mouse.position, 0).r;
  }  
      `;
        ///////////////////////////
        const pipelineLayout = new PipelineLayout2({
            label: 'ReadDepthPipeline',
            bindGroupLayouts: this.bindLayouts
        });
        this.entryPoints = {
            main: pipelineLayout
        }
        this.module = this.gpu.device.createShaderModule(
            {
                code: wgsl,
                label: 'ReadDepth.comp',
                hints: this.entryPoints
            });
    }
}