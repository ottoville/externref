import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js'
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { Struct, Vertices } from './structs/Structs.js';
import type { GPU } from '../../GPU.js'
import type { Terrain } from '../../world/Terrain.js';

type BindLayouts = readonly [BGLayout<[BufLayout<ShaderStage.COMPUTE, Struct<{
    vert: [string, string];
}>>, TextLayout<ShaderStage.COMPUTE>]>];
export class CreateGroundFromHeightMap extends ComputeShader<
    { main: PipelineLayout }, BindLayouts> {
    constructor(gpu: GPU, settings: typeof Terrain.settings) {
        const bindLayouts = [
            new BGLayout(gpu, 'indicesBindGroupLayout',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                            hasDynamicOffset: false,
                            minBindingSize: 48
                        }
                    }, 'positions', Vertices),
                new TextLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        texture: {

                        }

                    }, 'pixels', 'texture_2d<f32>'))
        ] as const

        const pipelineLayout = new PipelineLayout({
            label: 'CreateGroundFromHeightMapPipeline',
            bindGroupLayouts: bindLayouts
        });
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            label: "CreateGroundFromHeightMap.comp",
            entryPoints: {
                main: pipelineLayout
            },
            gpu
        });
        this.createWGSL(([positions, pixels]) => {
            //////////////////////////
            return /* wgsl */ `
    const filt:vec4<f32> = vec4<f32>(0.3, 0.59, 0.11, 0.0); 
    
    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
        let coords=vec2<f32>(
            f32(GlobalInvocationID.x * ${settings.size[0]}) / ${settings.subdivisions[0]},
            f32(GlobalInvocationID.y * ${settings.size[1]}) / ${settings.subdivisions[0]}
        );
        var position: vec3<f32> = vec3<f32>(
            f32(GlobalInvocationID.x *  ${settings.size[0]}) / ${settings.subdivisions[0]} - (${settings.size[0]}f / 2.0),
            0.0,
            f32((${settings.subdivisions[1]} - GlobalInvocationID.y) * ${settings.size[1]}) / ${settings.subdivisions[1]} - (${settings.size[1]} / 2.0)
        );
        // TODO: move to uniform
       let texture_size:vec2<u32> = textureDimensions(${pixels});
    
    
       let gradient:f32 = dot(textureLoad(${pixels}, vec2<i32>((vec2<f32>(texture_size)/vec2<f32>(${settings.size[0]}, ${settings.size[1]})) * coords.xy), 0), filt);    
    
       position.y = ${settings.minmax[0]} + f32( ${settings.minmax[1]} -  ${settings.minmax[0]}) * gradient;
       //position.y = 10.0;
       ${positions.prop('vert')}[GlobalInvocationID.y * (${settings.subdivisions[0]} + 1u) + GlobalInvocationID.x].position = position;
      
       ${positions.prop('vert')}[GlobalInvocationID.y * (${settings.subdivisions[0]} + 1u) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(${settings.maxXZ})) / vec2<f32>(${settings.size[0]}, ${settings.size[1]});
       return;
    }
      `;
            ///////////////
        })
    }
}