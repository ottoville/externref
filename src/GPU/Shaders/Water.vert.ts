import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { GPU } from "GPU.js"

type BindLayouts = GPU["bindGroupTextureWater"]["bindGroupLayouts"]

export class WaterVertShader extends VertexShader<
    { main: PipelineLayout },
    [GPUVertexBufferLayout],
    BindLayouts> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout
            },
            label: 'water.vert'
        }, [buffers]);
        this.createWGSL((
            [/*uniforms*/,],
            [scene,/*time, clusters_array, meshes, projection*/],
            [/*world*/,],
            [/*mySampler, diffuseTexture*/,]) => {

            //////////////////////////////////

            return /* wgsl */ `

//[[location(1)]] var<out> ambient : vec3<f32>;
struct Output {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec4<f32>,
  @location(1) position : vec3<f32>,
  @location(2) @interpolate(flat) id : u32
};

@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
  var output:Output;
  output.Position = ${scene.variableName}.modelViewProjection * vec4<f32>(position, 1.0);
  output.v_uv = output.Position;
  output.position=position;
  output.id=world.id;

  //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
  //ambient=lights.ambient;
  return output;
}
  `;
            //////////////

        })
    }
}