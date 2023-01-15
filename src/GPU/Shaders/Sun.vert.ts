import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';

type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>]

export class SunVertShader extends VertexShader<
  { main: PipelineLayout },
  [], PipelineLayout<BindLayouts>> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>) {

    super({
      pipelineLayout,
      entryPoints: {
        main: pipelineLayout
      },
      label: 'Sun.vert'
    }, []);
    this.createWGSL((
      [/*uniforms*/,],
      [scene, /*time, clusters_array, meshes, projection*/],
      [world]) => {

      //////////////////////////////////

      return /* wgsl */ `

const sunDistance: f32= 1495000.0;  //divided by 100000 correct one

struct Output {
  @builtin(position) Position : vec4<f32>
};

@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> Output {
  var vertices : array<vec2<f32>, 14> = array<vec2<f32>, 14>(
            vec2<f32>( -6824.0,  1557.0),
            vec2<f32>( -6824.0, -1557.0),
            vec2<f32>( -5472.0,  4364.0),
            vec2<f32>( -5472.0, -4364.0),
            vec2<f32>( -3037.0,  6306.0),
            vec2<f32>( -3037.0, -6306.0),
            vec2<f32>(     0.0,  7000.0),
            vec2<f32>(     0.0, -7000.0),
            vec2<f32>(  3037.0,  6306.0),
            vec2<f32>(  3037.0, -6306.0),
            vec2<f32>(  5472.0,  4364.0),
            vec2<f32>(  5472.0, -4364.0),
            vec2<f32>(  6824.0,  1557.0),
            vec2<f32>(  6824.0, -1557.0)
    );

  var output:Output;
  let curPos: vec3<f32> = ${world.variableName}.transformation[3].xyz;

  let transform : vec3<f32> = curPos * sunDistance;
  let CameraRight_worldspace : vec3<f32> = vec3<f32>(${scene.variableName}.view[0].x, ${scene.variableName}.view[1].x, ${scene.variableName}.view[2].x);
  let CameraUp_worldspace : vec3<f32>  = vec3<f32>(${scene.variableName}.view[0].y, ${scene.variableName}.view[1].y, ${scene.variableName}.view[2].y);
 
 
  let transformbill : vec3<f32> =  transform  + CameraRight_worldspace * vertices[VertexIndex].x + CameraUp_worldspace * vertices[VertexIndex].y;

  output.Position = scene.modelViewProjection * vec4<f32>(transformbill.xyz, 1.0);
  //output.Position.z = 1.0;
  //ambient=vec4<f32>(1.0,clamp(curPos.y*4.0,0.1,1.0),(max(curPos.y,0.0)),1.0);
  return output;
}
  `;
      //////////////
    })
  }
}