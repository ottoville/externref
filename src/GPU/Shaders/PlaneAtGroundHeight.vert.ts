import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';

type BindGroupLayouts = Terrain["TerrainHeightsbindGroupTree"]["bindGroupLayouts"];
export class PlaneAtGroundHeightVertShader extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindGroupLayouts> {
    constructor(
        pipelineLayout: PipelineLayout<BindGroupLayouts>,
        buffers: GPUVertexBufferLayout,
        settings: typeof Terrain.settings) {
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