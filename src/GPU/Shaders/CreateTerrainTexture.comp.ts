import { BindGroupLayout2, GPUBindGroupLayoutEntryBuffer, GPUBindGroupLayoutEntryStorageTexture } from '../BindGroupLayout2.js'
import { PipelineLayout2 } from '../PipelineLayout2.js';
import { ComputeShader } from './ComputeShader.js';

export class CreateTerrainTexture extends ComputeShader<{ main: PipelineLayout2 }> {
  entryPoints: { main: PipelineLayout2; };
  module: GPUShaderModule;
  bindLayouts: [BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>, BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer, GPUBindGroupLayoutEntryBuffer]>, BindGroupLayout2<[GPUBindGroupLayoutEntryStorageTexture]>]
  constructor(
    settingsLayout: BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>,
    slopesLayout: BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer, GPUBindGroupLayoutEntryBuffer]>) {
    super(settingsLayout.gpu);
    this.bindLayouts = [
      settingsLayout,
      slopesLayout,
      new BindGroupLayout2(this.gpu, 'TerrainTextureLayout',
        {
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
              access: 'write-only',
              format: 'rgba8unorm'
          }
        })
    ]
    const groups = this.getGroups();
    const wgsl = /* wgsl */ `
    struct Settings {
      size : vec2<u32>,
      bufferSize : vec2<u32>,
      subdivisions : u32,
      heightMinMax : vec2<i32>,
      max : vec2<i32>,
      textureSize:vec2<u32>
 };
 
  struct Plane {
   norm : vec3<f32>,
   d : f32
 };
 struct PlaneArray {
   plane: array<Plane>
 };
 struct IntArray {
   numbers: array<i32>
 };
 
 fn mod289(x:f32) -> f32 {
   return x - floor(x * (1. / 289.)) * 289.;
 }
 
 fn mod289_2(x:vec2<f32>) -> vec2<f32> {
   return x - floor(x * (1. / 289.)) * 289.;
 }
 
 fn mod289_3( x:vec3<f32>) -> vec3<f32> {
   return x - floor(x * (1. / 289.)) * 289.;
 }
 
 fn mod289_4(x:vec4<f32>) -> vec4<f32> {
   return x - floor(x * (1. / 289.)) * 289.;
 }
 fn permute(x:f32) -> f32 {
      return mod289(((x * 34.) + 1.)*x);
 }
 
 fn permute_3(x:vec3<f32>) -> vec3<f32>{
   return mod289_3(((x*34.0)+1.0)*x);
 }
 
 fn permute_4(x:vec4<f32>) -> vec4<f32> {
      return mod289_4(((x * 34.) + 1.)*x);
 }
 
 
 
 fn taylorInvSqrt(r:vec4<f32>) -> vec4<f32> {
   return 1.79284291400159 - 0.85373472095314 * r;
 }
 fn snoise2(v:vec3<f32>) -> f32 {
     let   C:vec2<f32> = vec2<f32>(1.0/6.0, 1.0/3.0);
     let   D:vec4<f32> = vec4<f32>(0.0, 0.5, 1.0, 2.0);
 
     // First corner
     var i:vec3<f32>  = floor(v + dot(v, C.yyy) );
     let x0:vec3<f32> =   v - i + dot(i, C.xxx) ;
 
     // Other corners
     let g :vec3<f32>= step(x0.yzx, x0.xyz);
     let l :vec3<f32>= 1.0 - g;
     let i1:vec3<f32> = min( g.xyz, l.zxy );
     let i2:vec3<f32> = max( g.xyz, l.zxy );
     //  x0 = x0 - 0.0 + 0.0 * C.xxx;
     //  x1 = x0 - i1  + 1.0 * C.xxx;
     //  x2 = x0 - i2  + 2.0 * C.xxx;
     //  x3 = x0 - 1.0 + 3.0 * C.xxx;
     let x1:vec3<f32> = x0 - i1 + C.xxx;
     let x2:vec3<f32> = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
     let x3:vec3<f32> = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
 
     // Permutations
     i = mod289_3(i);
     let p:vec4<f32> = permute_4( permute_4( permute_4(
                 i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0 ));
 
     // Gradients: 7x7 points over a square, mapped onto an octahedron.
     // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
     let n_:f32 = 0.142857142857; // 1.0/7.0
     let ns:vec3<f32> = n_ * D.wyz - D.xzx;
 
     let j :vec4<f32>= p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
     let x_:vec4<f32> = floor(j * ns.z);
     let y_:vec4<f32> = floor(j - 7.0 * x_ );    // mod(j,N)
     let x :vec4<f32>= x_ *ns.x + ns.yyyy;
     let y :vec4<f32>= y_ *ns.x + ns.yyyy;
     let h :vec4<f32>= 1.0 - abs(x) - abs(y);
     let b0:vec4<f32> = vec4<f32>( x.xy, y.xy );
     let b1:vec4<f32> = vec4<f32>( x.zw, y.zw );
     let s0:vec4<f32> = floor(b0)*2.0 + 1.0;
     let s1:vec4<f32> = floor(b1)*2.0 + 1.0;
     let sh:vec4<f32> = -step(h, vec4(0.0));
     let a0:vec4<f32> = b0.xzyw + s0.xzyw*sh.xxyy ;
     let a1:vec4<f32> = b1.xzyw + s1.xzyw*sh.zzww ;
     var p0:vec3<f32> = vec3<f32>(a0.xy,h.x);
     var p1:vec3<f32> = vec3<f32>(a0.zw,h.y);
     var p2:vec3<f32> = vec3<f32>(a1.xy,h.z);
     var p3:vec3<f32> = vec3<f32>(a1.zw,h.w);
 
     //Normalise gradients
     let norm:vec4<f32> = taylorInvSqrt(vec4<f32>(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
     p0 = p0 * norm.x;
     p1 = p1 * norm.y;
     p2 = p2 * norm.z;
     p3 = p3 * norm.w;
 
     // Mix final noise value
     var m:vec4<f32> = max(0.6 - vec4<f32>(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), vec4<f32>(0.0,0.0,0.0,0.0));
     m = m * m;
     return 42.0 * dot( m*m, vec4<f32>( dot(p0,x0), dot(p1,x1),
                                 dot(p2,x2), dot(p3,x3) ) );
 }
 

 ${groups[0]![0]} settings : Settings;
 ${groups[1]![0]} slopes : IntArray;
 ${groups[1]![1]} facet12 : PlaneArray;
 ${groups[2]![0]} ground_texture: texture_storage_2d<rgba8unorm,write>;
 
 
 @compute @workgroup_size(1)
 fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
     let facetSize:u32 = settings.subdivisions * settings.subdivisions; // 250 * 250;
 
     let cx:i32 = i32(f32(GlobalInvocationID.x) * (f32(settings.size.x)/f32(settings.textureSize.x)) - f32(settings.size.x/u32(2)));
     let cz:i32 = i32(f32(GlobalInvocationID.y) * (f32(settings.size.y)/f32(settings.textureSize.y)) - f32(settings.size.y/u32(2)));
 
     let col:u32 = u32(floor(f32((cx + settings.max.x) * i32(settings.subdivisions)) / f32(settings.size.x)));
     let row:u32 = u32(floor(- f32((cz + settings.max.y) * i32(settings.subdivisions)) / f32(settings.size.y) + f32(settings.subdivisions)));
     let slope:i32 = slopes.numbers[row * settings.subdivisions + col];
     var norm:vec3<f32>;
     var d:f32;
     if(cz < -1 * cx + slope) {
         norm = facet12.plane[row * settings.subdivisions + col].norm;
         d = facet12.plane[row * settings.subdivisions + col].d;
     } else {
         let index:u32 = facetSize + (row * settings.subdivisions + col);
         norm = facet12.plane[index].norm;
         d = facet12.plane[index].d;
     }
 
     let y:f32 = -(norm.x * f32(cx) + norm.z * f32(cz) + d) / norm.y;
     if( y > 3.0 ) {
       let r = (snoise2(vec3<f32>(vec2<f32>(GlobalInvocationID.xy),y))+1.0)*0.5;
       let b = (snoise2(vec3<f32>(vec2<f32>(GlobalInvocationID.yx),y))+1.0)*0.5;
         textureStore(ground_texture, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(r,1.0,b,1.0));
      } else {
         textureStore(ground_texture, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(1.0,1.0,0.0,1.0));
      }
     return;
   }
      `;
    const pipelineLayout = new PipelineLayout2({
      label: 'CreateTerrainTexturePipeline',
      bindGroupLayouts: this.bindLayouts
    });
    this.entryPoints = {
      main: pipelineLayout
    }
    this.module = this.gpu.device.createShaderModule(
      {
        code: wgsl,
        label: 'CreateTerrainTexture.comp',
        hints: this.entryPoints
      });
  }
}