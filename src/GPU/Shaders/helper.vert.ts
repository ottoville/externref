import { BGLayout, BufLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
  //////////////////////////////////

  const wgsl = /* wgsl */ `
  
 //let PI:f32 = 3.1415926535897932384626433832795;
 const angleStep:f32 = 0.7853981633974483; //(PI * 2.0) / 8.0;
 
 fn getHeightAtCoordinates(xz:vec2<f32>, facetSize:u32) -> f32 {
     let col:u32 = u32(floor((xz.x + f32(settings.max.x)) * f32(settings.subdivisions) / f32(settings.size.x)));
     let row:u32 = u32(floor(- (xz.y + f32(settings.max.y)) * f32(settings.subdivisions) / f32(settings.size.x) + f32(settings.subdivisions)));
     let slope:f32 = f32(slopes.numbers[row * settings.subdivisions + col]);
     var norm:vec3<f32>;
     var d:f32;
     if(xz.y < -1.0 * xz.x + slope) {
         norm = facet12.plane[row * settings.subdivisions + col].norm;
         d = facet12.plane[row * settings.subdivisions + col].d;
     } else {
         var index:u32=facetSize + u32(row * settings.subdivisions + col);
         norm = facet12.plane[index].norm;
         d = facet12.plane[index].d;
     }
     return -(norm.x * f32(xz.x) + norm.z * f32(xz.y) + d) / norm.y;
  };
 struct Output {
   @location(0) color : vec3<f32>,
   @builtin(position) Position : vec4<f32>
 };
 const vertices : array<vec2<f32>, 4> = array<vec2<f32>, 4>(
   vec2<f32>( -0.5,  2.0),
   vec2<f32>( -0.5, -2.0),
   vec2<f32>( 0.5,  3.0),
   vec2<f32>( 0.5, -3.0)
 );
 @vertex
 fn main(
   @builtin(instance_index) instanceIdx : u32,
   @builtin(vertex_index) VertexIndex : u32) -> Output {
 
     var output:Output;
     let facetSize:u32 = settings.subdivisions * settings.subdivisions; //250 * 250;
 
     var angle:f32 = (f32(time.time) * 0.001) + f32(instanceIdx) * angleStep;
     var c:f32 = cos(angle);
     var s:f32 = sin(angle);
     var position:vec3<f32> =vec3<f32>(vertices[VertexIndex].x,1.5,vertices[VertexIndex].y);
     var rotated:vec2<f32> =vec2<f32>(position.x * c - position.z * s, position.x * s + position.z * c);
     var offset:vec2<f32> = rotated + vec2<f32>(10.0 * c, 10.0 * s);
 
 
     var worldPos:vec4<f32> = world.transformation * vec4<f32>(offset.x, position.y, offset.y, 1.0);
     worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz, facetSize) + 3.0;
     output.Position = scene.modelViewProjection * worldPos;
     output.color = vec3<f32>(1.0,1.0,1.0);
     return output;
 }
    `;

  //////////////////////////////////

type BindLayouts = readonly [
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout, BufLayout, BufLayout]>,
  BGLayout<[BufLayout]>,
  BGLayout<[BufLayout, BufLayout, BufLayout]>,
];
export class HelperVertShader extends VertexShader<
{ main: PipelineLayout },
  []> {
  constructor(
    pipelineLayout: PipelineLayout<BindLayouts>) {

    super(pipelineLayout, [], wgsl,{
      main: pipelineLayout
    }, 'helper.vert');
  }
}