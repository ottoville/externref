import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js'
import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { MeshUniforms } from './structs/Structs.js';

export type BindLayoutsGroundHeight = readonly [
    GPU["sizeBindGroupLayout"],
    GPU["uniformBindGroupLayoutWithTime"],
    BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>]>,
    Terrain["heightsLayout"]
]
export class PlaneAtGroundHeightVertShader extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindLayoutsGroundHeight> {
    constructor(
        pipelineLayout: PipelineLayout<BindLayoutsGroundHeight>,
        buffers: GPUVertexBufferLayout,
        settings: typeof Terrain.settings) {
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
            [world],
            [slopes, facet12]) => {

            //////////////////////////////////

            return /* wgsl */ `

      ${getHeightAtCoordinates(settings, slopes, facet12)}

struct Output {
 @location(0) color : vec3<f32>,
 @builtin(position) Position : vec4<f32>
};
@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
   var output:Output;
   var worldPos:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(position.x, 0.0, position.y, 1.0);
   worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz);
   output.Position = ${scene.prop('modelViewProjection')} * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   return output;
}
   `;


            //////////////////////////////////
        })
    }
}