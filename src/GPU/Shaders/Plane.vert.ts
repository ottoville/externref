import { BindGroupLayout, BindGroupLayoutEntry, GPUBindGroupLayoutEntryBuffer } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import { MeshUniforms } from './structs/MeshUniforms.js';


//////////////////////////////////

const wgsl = /* wgsl */ `
 struct Uniforms {
  viewProjection : mat4x4<f32>,
  view : mat4x4<f32>,
  viewPosition : vec3<f32>
};

struct IntArray {
  numbers: array<i32>
};

struct Plane {
  norm : vec3<f32>,
  d : f32
};
struct PlaneArray {
  plane: array<Plane>
};

${MeshUniforms}
struct Settings {
    size : vec2<u32>,
    bufferSize : vec2<u32>,
    subdivisions : u32,
    heightMinMax : vec2<i32>,
    max : vec2<i32>
};

fn getHeightAtCoordinates(xz:vec2<f32>, facetSize:u32) -> f32 {
   let col:u32 = u32(floor((xz.x + f32(settings.max.x)) * f32(settings.subdivisions) / f32(settings.size.x)));
   let row:u32 = u32(floor(- (xz.y + f32(settings.max.y)) * f32(settings.subdivisions) / f32(settings.size.y) + f32(settings.subdivisions)));
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
@vertex
fn main(@location(0) position : vec3<f32>) -> Output {
   let facetSize:u32 = settings.subdivisions * settings.subdivisions; //250 * 250;
   var output:Output;
   var worldPos:vec4<f32> = worldposition.transformation * vec4<f32>(position.x, 0.0, position.y, 1.0);
   worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz, facetSize);
   output.Position = uniforms.viewProjection * worldPos;
   output.color = vec3<f32>(1.0,1.0,1.0);
   return output;
}
   `;


//////////////////////////////////

type BindLayouts = readonly [
  BindGroupLayout<[
    BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>
  ]>,
  BindGroupLayout<[
    BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>
  ]>,
  BindGroupLayout<[
    BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>,
    BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>,
    BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>
  ]>
];

export class PlaneVertShader extends VertexShader<
  { main: PipelineLayout },
  [GPUVertexBufferLayout],
  BindLayouts> {
  constructor(bindLayouts: BindLayouts, buffers: GPUVertexBufferLayout) {
    const pipelineLayout = new PipelineLayout({
      label: 'debugBoundingBoxPipeline',
      bindGroupLayouts: bindLayouts
    });
    const entryPoints = {
      main: pipelineLayout
    }
    super(bindLayouts[0].gpu, bindLayouts, [buffers], wgsl, entryPoints, 'plane.vert', 1);
  }
}