import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'
import { MeshUniforms } from './structs/Structs.js';

type BindLayouts = readonly [
    GPU["sizeBindGroupLayout"],
    GPU["uniformBindGroupLayoutWithTime"],
    BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>]>,

]
export class Plane extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout
            },
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
   var worldPos:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(position.xyz, 1.0);
   output.Position = ${scene.prop('modelViewProjection')} * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   return output;
}
   `;


            //////////////////////////////////
        })
    }
}