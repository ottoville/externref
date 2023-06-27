import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'
import { MeshUniforms, colorOutput } from './structs/Structs.js';
import { VertexShaderFunction } from './ShaderFunction.js';

type BindLayouts = [
    GPU["sizeBindGroupLayout"],
    GPU["uniformBindGroupLayoutWithTime"],
    BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>]>,

]
export class Plane extends VertexShader<BindLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new VertexShaderFunction(
                    colorOutput,
                    pipelineLayout,
                    ``,
                    [buffers], ([
                        [/*uniforms*/,],
                        [scene,/*time, clusters_array, meshes, projection*/],
                        [world]
                    ]) =>
                        /* wgsl */ `
                var output:Output;
                var worldPos:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(position.xyz, 1.0);
                output.Position = ${scene.prop('modelViewProjection')} * worldPos;
                output.color = vec3<f32>(1.0,1.0,1.0);
                return output;
                `)
            },
            label: 'plane.vert',
            gpu: pipelineLayout.gpu
        });
    }
}