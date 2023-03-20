import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js'
import { Depth_And_Mesh, Mouse, Struct } from './structs/Structs.js';

type BindLayouts = readonly [
    BGLayout<[BufLayout<ShaderStage.COMPUTE>]>,
    BGLayout<[TextLayout<ShaderStage.COMPUTE>,
        TextLayout<ShaderStage.COMPUTE>,
        BufLayout<ShaderStage.COMPUTE, Struct<{
            position: [string, string];
        }>>
    ]>]
export class ReadDepth extends ComputeShader<{ main: PipelineLayout }, BindLayouts> {
    constructor(gpu: GPU) {
        const bindLayouts = [
            new BGLayout(gpu, 'DepthAndMeshLayout',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
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
                        visibility: ShaderStage.COMPUTE,
                        texture: {
                            multisampled: true,
                            sampleType: 'depth'
                        }
                    }, 'depth_texture', 'texture_depth_multisampled_2d'),
                new TextLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        texture: {
                            multisampled: false,
                            sampleType: 'uint'
                        }
                    }, 'mesh_texture', 'texture_2d<u32>'),
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
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
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            label: "ReadDepth.comp",
            entryPoints: {
                main: pipelineLayout
            },
            gpu
        });
        this.createWGSL(([/*depth_and_mesh*/,], [depth_texture, mesh_texture, mouse]) => {
            ///////////////////////////
            return /* wgsl */ `
                     @compute @workgroup_size(1, 1, 1)
                     fn main(
                         @builtin(global_invocation_id) global_id : vec3<u32>
                     ) {
                     
                         depth_and_mesh.depth=textureLoad(${depth_texture.variableName}, ${mouse.prop('position')}, 1);
                         depth_and_mesh.mesh=textureLoad(${mesh_texture.variableName}, ${mouse.prop('position')}, 0).r;
                     }  
                         `;
            ///////////////////////////
        })
    }
}