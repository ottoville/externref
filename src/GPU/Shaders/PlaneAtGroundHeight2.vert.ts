import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js';

type BindGroupLayouts = GPU["positionAndTimeBindGroup"]["bindGroupLayouts"];

export class PlaneAtGroundHeightVertShader2 extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindGroupLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindGroupLayouts>,
        buffers: GPUVertexBufferLayout) {
        const entryPoints = {
            main: pipelineLayout
        }
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints,
            label: 'plane.vert',
            gpu: pipelineLayout.gpu
        }, [buffers]);

        this.createWGSL((
            [/*uniforms*/,],
            [scene,/*time, clusters_array, meshes, projection*/],
            [world]) => {

            //////////////////////////////////
            //      ${getHeightAtCoordinates(settings, heightMap, facet12)}
            //worldPos.y = (f32(textureLoad(${heightMap}, vec2<u32>(u32(worldPos.x), u32(worldPos.z)), 0).x)) * 500.0; //500 is max height

            return /* wgsl */ `


struct Output {
 @location(0) color : vec3<f32>,
 @builtin(position) Position : vec4<f32>
};
@vertex
fn main(@location(0) position : vec4<f32>) -> Output {
   var output:Output;
   var worldPos:vec4<f32> = ${world.prop('transformation')} * position;

   output.Position = ${scene.prop('modelViewProjection')} * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   //output.position=vec3<f32>(worldPos.xyz);
   //output.scenes=${world.prop('scenes')}; 
   return output;
}
   `;


            //////////////////////////////////
        })
    }
}