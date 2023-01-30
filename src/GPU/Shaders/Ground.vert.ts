import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js'
type BindLayouts = GPU["lightsBindGroupTexture2"]["bindGroupLayouts"]

export class GroundVertShader extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindLayouts> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {

        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout
            },
            label: 'Ground.vert'
        }, [buffers]);
        this.createWGSL((
            [/*uniforms*/,],
            [scene,/*time, clusters_array, meshes, projection*/],
            [world]) => {


            //////////////////////////////////

            return /* wgsl */ `
struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) position : vec3<f32>,
  @location(3) @interpolate(flat) id : u32,  
  @location(4) @interpolate(flat) scenes : u32  
 };


@vertex
fn main(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> Output {
  var output : Output;
  output.Position = ${scene.prop('modelViewProjection')} * vec4<f32>(position.xyz, 1.0);
  //shading = dot(normal, lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;

  output.v_uv=uv; 
  output.normal=normal;
  output.position=position;

  //let localPosition:vec4<f32> = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
  //output.position=localPosition.xyz;//position;
  output.id=${world.prop('id')};
  output.scenes=${world.prop('scenes')};
  return output;
}
struct PickOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) @interpolate(flat) id : u32
};
@vertex
fn pick(@location(0) position : vec3<f32>,
        @location(1) uv : vec2<f32>,
        @location(2) normal : vec3<f32> ) -> PickOutput {
  var output : PickOutput;
  output.Position = ${scene.prop('modelViewProjection') } * vec4<f32>(position.xyz, 1.0);
  output.id=${world.prop('id') };
  return output;
}
  `;
            //////////////

        })
    }
}