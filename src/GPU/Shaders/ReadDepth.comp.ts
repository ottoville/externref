import { BGLayout, BufLayout, TextLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js'
import { Depth_And_Mesh, Mouse } from './structs/Structs.js';

/////////////////
const wgsl = /* wgsl */ `
         @compute @workgroup_size(1, 1, 1)
         fn main(
             @builtin(global_invocation_id) global_id : vec3<u32>
         ) {
         
             depth_and_mesh.depth=textureLoad(depth_texture, mouse.position, 1);
             depth_and_mesh.mesh=textureLoad(mesh_texture, mouse.position, 0).r;
         }  
             `;
///////////////////////////

export class ReadDepth extends ComputeShader<{ main: PipelineLayout }> {
    bindLayouts: readonly [BGLayout<[BufLayout]>,
        BGLayout<[TextLayout, TextLayout, BufLayout]>];
    constructor(gpu: GPU) {
        const bindLayouts = [
            new BGLayout(gpu, 'DepthAndMeshLayout',
                new BufLayout(
                    {
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                            hasDynamicOffset: false,
                            minBindingSize: 16
                        }
                    }, 'depth_and_mesh', Depth_And_Mesh)
            ),
            new BGLayout(gpu, 'DepthTextureLayout',
                new TextLayout(
                    {
                        visibility: GPUShaderStage.COMPUTE,
                        texture: {
                            multisampled: true,
                            sampleType: 'depth'
                        }
                    }, 'depth_texture', 'texture_depth_multisampled_2d'),
                new TextLayout(
                    {
                        visibility: GPUShaderStage.COMPUTE,
                        texture: {
                            multisampled: false,
                            sampleType: 'uint'
                        }
                    }, 'mesh_texture', 'texture_2d<u32>'),
                new BufLayout(
                    {
                        visibility: GPUShaderStage.COMPUTE,
                        buffer: {
                            type: 'uniform',
                            hasDynamicOffset: false,
                            minBindingSize: 8
                        }
                    }, 'mouse', Mouse)
            )
        ] as const;


        const pipelineLayout = new PipelineLayout({
            label: 'ReadDepthPipeline',
            bindGroupLayouts: bindLayouts
        });
        super({
            pipelineLayout,
            wgsl,
            label: "ReadDepth.comp",
            entryPoints: {
                main: pipelineLayout
            }
        });
        this.bindLayouts = bindLayouts;
    }
}