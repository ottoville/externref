import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import type { Terrain } from '../../world/Terrain.js';
import { PlaneArray, IntArray } from './structs/Structs.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { ComputeShaderFunction } from './ShaderFunction.js';

export type SlopesLayout = BGLayout<{
    slopes: BufLayout<ShaderStage.COMPUTE, typeof IntArray>,
    facet12: BufLayout<ShaderStage.COMPUTE, typeof PlaneArray>
}>;

type BindLayouts = readonly [
    SlopesLayout,
    BGLayout<{ground_texture: TextLayout<ShaderStage.COMPUTE>}>];
export class CreateTerrainTexture extends ComputeShader<BindLayouts> {
    constructor(
        settings: typeof Terrain.settings,
        slopesLayout: SlopesLayout) {
        const bindLayouts = [
            slopesLayout,
            new BGLayout(slopesLayout.gpu,
                'TerrainTextureLayout',
                {
                    ground_texture: new TextLayout(
                        {
                            storageTexture: {
                                access: 'write-only',
                                format: 'rgba8unorm',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        'texture_storage_2d<rgba8unorm,write>'
                    ),
                }
            )
        ] as const;

        const pipelineLayout = new PipelineLayout({
            bindGroupLayouts: bindLayouts,
            label: 'CreateTerrainTexturePipeline',
        });
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new ComputeShaderFunction('@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>',
                    pipelineLayout,
                    [1],
                    ([/*{ _slopes, _facet12, }*/, { ground_texture, }]) => /* wgsl */
                        `
                let cx:f32 = f32(GlobalInvocationID.x) * (f32(${settings.size[0]})/f32(${settings.textureSize.width})) - f32(${settings.size[0]}/u32(2));
                let cz:f32 = f32(GlobalInvocationID.y) * (f32(${settings.size[1]})/f32(${settings.textureSize.height})) - f32(${settings.size[1]}/u32(2));
            
                let y:f32 = getHeightAtCoordinates(vec2<f32>(cx, cz));
                if( y > 4.0 ) {
                  let r = (snoise2(vec3<f32>(vec2<f32>(GlobalInvocationID.xy),y))+1.0)*0.5;
                  let b = (snoise2(vec3<f32>(vec2<f32>(GlobalInvocationID.yx),y))+1.0)*0.5;
                    textureStore(${ground_texture}, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(r,1.0,b,1.0));
                 } else {
                    textureStore(${ground_texture}, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(1.0,1.0,0.0,1.0));
                 }
                return;
               
                `),
            },
            gpu: pipelineLayout.gpu,
            label: 'CreateTerrainTexture.comp',
        },
        ([{ slopes, facet12, }/*{ _ground_texture, }*/]) => /* wgsl */
            `
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
            ${getHeightAtCoordinates(settings,
        slopes,
        facet12)}
        `);
    }
}