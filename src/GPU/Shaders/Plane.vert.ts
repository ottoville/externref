import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'

type BindLayouts = readonly [
    GPU["sizeBindGroupLayout"],
    GPU["uniformBindGroupLayoutWithTime"],
    BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT>]>,

]
export class Plane extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindLayouts>,
        buffers: GPUVertexBufferLayout) {
        const entryPoints = {
            main: pipelineLayout
        }
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints,
            label: 'plane.vert'
        }, [buffers]);

        this.createWGSL((
            [/*uniforms*/,],
            [scene,/*time, clusters_array, meshes, projection*/],
            [world]) => {

            //////////////////////////////////

            return /* wgsl */ `


struct Output {
 @location(0) color : vec3<f32>,
 @builtin(position) Position : vec4<f32>
};
@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
   var output:Output;
   var worldPos:vec4<f32> = ${world.variableName}.transformation * vec4<f32>(position.xyz, 1.0);
   output.Position = ${scene.variableName}.modelViewProjection * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   return output;
}
   `;


            //////////////////////////////////
        })
    }
}