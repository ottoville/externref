import { BGLayout, BindGroupLayoutEntry, BufLayout, GPUBindGroupLayoutEntryBuffer } from '../../BindGroupLayout.js'
import { PipelineLayout } from '../../PipelineLayout.js';
import { ComputeShader } from '../ComputeShader.js';
import { FloatArray, IntArray, PlaneArray, PositionAndRotateArray, Vec2Array } from '../structs/Structs.js';

const wgsl = /* wgsl */ `

struct Plane {
  norm : vec3<f32>,
  d : f32
};

struct PositionAndRotate {
   position : vec3<f32>,
   rotation : f32
};

const PI:f32 = 3.141592653589793;
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 
fn mod289_v3(x:vec3<f32>) -> vec3<f32> {
    return x - floor(x * vec3<f32>(1.0 / 289.0,1.0 / 289.0,1.0 / 289.0)) * vec3<f32>(289.0,289.0,289.0);
}
fn mod289_v2(x:vec2<f32>) -> vec2<f32> {
    return x - floor(x * vec2<f32>(1.0 / 289.0,1.0 / 289.0)) * vec2<f32>(289.0,289.0);
}
fn permute(x:vec3<f32>) -> vec3<f32> {
    return mod289_v3(((x * vec3<f32>(34.0,34.0,34.0)) + vec3<f32>(1.0,1.0,1.0)) * x);
}
fn snoise(v:vec2<f32>) -> f32 {
    let C:vec4<f32> = vec4<f32>(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    // First corner
    var d1:f32 = dot(v, C.yy);
    var i:vec2<f32>  = floor(v + vec2<f32>(d1,d1) );
    var d2:f32 = dot(i, C.xx);
    var x0:vec2<f32> = v -   i + vec2<f32>(d2,d2);

    // Other corners
    var i1:vec2<f32>;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    if(x0.x > x0.y) {
        i1 = vec2<f32>(1.0, 0.0);
    } else {
        i1 = vec2<f32>(0.0, 1.0);
    }
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    var x12:vec4<f32> = x0.xyxy + C.xxzz;
   // x12.xy = x12.xy - i1;
    x12.x=x12.x-i1.x;
    x12.y=x12.y-i1.y;

    // Permutations
    i = mod289_v2(i); // Avoid truncation effects in permutation
    var p:vec3<f32> = permute( permute( i.yyy + vec3<f32>(0.0, i1.y, 1.0 ))
    + i.xxx + vec3<f32>(0.0, i1.x, 1.0 ));

    var m:vec3<f32> = max(vec3<f32>(0.5,0.5,0.5) - vec3<f32>(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), vec3<f32>(0.0,0.0,0.0));
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    var x:vec3<f32> = vec3<f32>(2.0,2.0,2.0) * fract(p * C.www) - vec3<f32>(1.0,1.0,1.0);
    var h:vec3<f32> = abs(x) - vec3<f32>(0.5,0.5,0.5);
    var ox:vec3<f32> = floor(x + vec3<f32>(0.5,0.5,0.5));
    var a0:vec3<f32> = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m = m * (vec3<f32>(1.79284291400159,1.79284291400159,1.79284291400159) - vec3<f32>(0.85373472095314,0.85373472095314,0.85373472095314) * ( a0*a0 + h*h ));

    // Compute final noise value at P
    var g:vec3<f32>;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
   // g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;
    return 130.0 * dot(m, g);
}
fn rand(co:vec2<f32>) -> f32 {
    return fract(sin(dot(co.xy ,vec2<f32>(12.9898,78.233))) * 43758.5453);
}
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



@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    let facetSize:u32 = settings.subdivisions * settings.subdivisions; //250 * 250;


    let flatpos:vec2<f32> = positions.vectors[GlobalInvocationID.x]; 
    let y:f32 = getHeightAtCoordinates(flatpos, facetSize);
    positionAndRotate.arr[GlobalInvocationID.x].position = vec3<f32>(flatpos.x,y,flatpos.y);
    positionAndRotate.arr[GlobalInvocationID.x].rotation = 3.145 * rand(flatpos);
    var index:u32 = GlobalInvocationID.x * u32(4);
    shapes.numbers[index] = 0.4 + 0.6 * rand(vec2<f32>(flatpos.yx)); // x:scale
    shapes.numbers[index + u32(1)] = PI *0.2 * rand(vec2<f32>(flatpos.x, flatpos.y + f32(GlobalInvocationID.x))); // baseAngle
    shapes.numbers[index + u32(2)] = PI *0.2 * rand(vec2<f32>(flatpos.xy)); // z:curve
    shapes.numbers[index + u32(3)] = snoise(vec2<f32>(flatpos.xy)); //  w:color
    return;
}
  `;

export class getHeightAtCoordinates extends ComputeShader<
  [
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>, BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
    BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>,
  ],
  { main: PipelineLayout }> {
  constructor(settingsLayout: BGLayout<[BindGroupLayoutEntry<GPUBindGroupLayoutEntryBuffer>]>) {
    //TODO: set actual minBindingSize values other than 32
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'slopesBindGroupLayout',
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            },
          }, 'slopes', IntArray),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            },
          }, 'facet12', PlaneArray),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            },
          }, 'positionAndRotate', PositionAndRotateArray),
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            },
          }, 'shapes', FloatArray),
      ),
      new BGLayout(settingsLayout.gpu, 'positionsBindGroupLayout',
        new BufLayout(
          {
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: "read-only-storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            },
          }, 'positions', Vec2Array))
    ] as const


    const pipelineLayout = new PipelineLayout({
      label: 'GetHeightAtCoordinatesPipeLine',
      bindGroupLayouts: bindLayouts
    });
    super(settingsLayout.gpu, bindLayouts, wgsl, "GetHeightAtCoordinates.comp", {
      main: pipelineLayout
    });
  }
}