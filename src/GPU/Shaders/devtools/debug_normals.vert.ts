import { PipelineLayout } from '../../PipelineLayout.js';
import { VertexShader } from '../VertexShader.js';
import { GPU } from '../../../GPU.js'

type BindLayouts = GPU["positionAndTimeBindGroup"]["bindGroupLayouts"];

export class DebugNormalsVertShader extends VertexShader<
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
            label: 'debug_normals.vert',
            gpu: pipelineLayout.gpu
        }, [buffers]);
        this.createWGSL((
            [/*uniforms*/,],
            [scene,/*time, clusters_array, meshes, projection*/],
            [world]) => {

            //////////////////////////////////

            return /* wgsl */ `

struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec3<f32>
 };

@vertex
fn main(
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
  @builtin(vertex_index) gl_VertexIndex : u32 ) -> Output {
    var output : Output;
    var vertexPosition:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(position.xyz, 1.0);
    if(gl_VertexIndex % 2u == 1u) {
        /*
            Drop translation part from matrix
        */
        var matt: mat3x3<f32> = mat3x3<f32>(
            ${world.prop('transformation')}[0].xyz,
            ${world.prop('transformation')}[1].xyz,
            ${world.prop('transformation')}[2].xyz
        );
        var transformed_normal = normalize(matt * normal);
        vertexPosition = vertexPosition + vec4<f32>(transformed_normal*10.0, 0.0);
    }
    output.Position = ${scene.prop('modelViewProjection')} * vertexPosition;
    output.color=vec3<f32>(0.0,1.0,0.0);
    return output;
  }
   `;


            //////////////////////////////////
        })
    }
}