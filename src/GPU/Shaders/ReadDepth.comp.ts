import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { GPU } from '../../GPU.js'
import { Depth_And_Mesh, Mouse } from './structs/Structs.js';
import { ComputeShaderFunction } from './ShaderFunction.js';

type BindLayouts = readonly [
    BGLayout<{
        depth_and_mesh: BufLayout<ShaderStage.COMPUTE>}>,
    BGLayout<{
        depth_texture: TextLayout<ShaderStage.COMPUTE>,
        mesh_texture: TextLayout<ShaderStage.COMPUTE>,
        mouse: BufLayout<ShaderStage.COMPUTE, typeof Mouse>
    }>]
export class ReadDepth extends ComputeShader<BindLayouts> {
    constructor(gpu: GPU) {
        const bindLayouts = [
            new BGLayout(gpu,
                'DepthAndMeshLayout',
                {
                    depth_and_mesh: new BufLayout(
                        {
                            buffer: {
                                hasDynamicOffset: false,
                                minBindingSize: 16,
                                type: 'storage',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        Depth_And_Mesh),
                }
            ),
            new BGLayout(gpu,
                'DepthTextureLayout',
                {
                    depth_texture: new TextLayout(
                        {
                            texture: {
                                multisampled: true,
                                sampleType: 'depth',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        'texture_depth_multisampled_2d'),
                    mesh_texture: new TextLayout(
                        {
                            texture: {
                                multisampled: false,
                                sampleType: 'uint',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        'texture_2d<u32>'),
                    mouse: new BufLayout(
                        {
                            buffer: {
                                hasDynamicOffset: false,
                                minBindingSize: 8,
                                type: 'uniform',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        Mouse),
                }
            )
        ] as const;


        const pipelineLayout = new PipelineLayout({
            bindGroupLayouts: bindLayouts,
            label: 'ReadDepthPipeline',
        });
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new ComputeShaderFunction(
                    '@builtin(global_invocation_id) global_id : vec3<u32>',
                    pipelineLayout,
                    [1, 1, 1],
                    ([/*{depth_and_mesh}*/, { depth_texture, mesh_texture, mouse, }]) =>
                        `
                    depth_and_mesh.depth=textureLoad(${depth_texture.variableName}, ${mouse.prop('position')}, 1);
                    depth_and_mesh.mesh=textureLoad(${mesh_texture.variableName}, ${mouse.prop('position')}, 0).r;
                `),
            },
            gpu,
            label: 'ReadDepth.comp',
        });
    }
}