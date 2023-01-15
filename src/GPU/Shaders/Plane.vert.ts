import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';


type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout]>,
];
export class PlaneVertShader extends VertexShader<
  { main: PipelineLayout },
  [GPUVertexBufferLayout],
  PipelineLayout<BindLayouts>> {
  constructor(pipelineLayout: PipelineLayout<BindLayouts>, buffers: GPUVertexBufferLayout) {
    const entryPoints = {
      main: pipelineLayout
    }
    super({
      pipelineLayout,
      entryPoints,
      label: 'plane.vert'
    },
      [buffers]);

    this.createWGSL((
      [/*uniforms*/,],
      [scene, /*time, clusters_array, meshes, projection*/],
      [world],
      [slopes, facet12, settings]) => {

      //////////////////////////////////

      return /* wgsl */ `

fn getHeightAtCoordinates(xz:vec2<f32>, facetSize:u32) -> f32 {
   let col:u32 = u32(floor((xz.x + f32(${settings.variableName}.max.x)) * f32(${settings.variableName}.subdivisions) / f32(${settings.variableName}.size.x)));
   let row:u32 = u32(floor(- (xz.y + f32(${settings.variableName}.max.y)) * f32(${settings.variableName}.subdivisions) / f32(${settings.variableName}.size.y) + f32(${settings.variableName}.subdivisions)));
   let slope:f32 = f32(${slopes.variableName}.numbers[row * ${settings.variableName}.subdivisions + col]);
   var norm:vec3<f32>;
   var d:f32;
   if(xz.y < -1.0 * xz.x + slope) {
       norm = ${facet12.variableName}.plane[row * ${settings.variableName}.subdivisions + col].norm;
       d = ${facet12.variableName}.plane[row * ${settings.variableName}.subdivisions + col].d;
   } else {
       var index:u32=facetSize + u32(row * ${settings.variableName}.subdivisions + col);
       norm = ${facet12.variableName}.plane[index].norm;
       d = ${facet12.variableName}.plane[index].d;
   }
   return -(norm.x * f32(xz.x) + norm.z * f32(xz.y) + d) / norm.y;
};
struct Output {
 @location(0) color : vec3<f32>,
 @builtin(position) Position : vec4<f32>
};
@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
   let facetSize:u32 = ${settings.variableName}.subdivisions * ${settings.variableName}.subdivisions; //250 * 250;
   var output:Output;
   var worldPos:vec4<f32> = ${world.variableName}.transformation * vec4<f32>(position.x, 0.0, position.y, 1.0);
   worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz, facetSize);
   output.Position = ${scene.variableName}.modelViewProjection * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   return output;
}
   `;


      //////////////////////////////////
    })
  }
}