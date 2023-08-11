import { BGLayout, BufLayout, ShaderStage, TextLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { Vertices } from './structs/Structs.js';
import type { GPU } from '../../GPU.js';
import type { Terrain } from '../../world/Terrain.js';
import { ComputeShaderFunction } from './ShaderFunction.js';

export function CreateGroundFromHeightMap(gpu: GPU, settings: typeof Terrain.settings, textureSize: { width: number, height: number }) {
    const bindLayouts = [
        new BGLayout(gpu,
            'indicesBindGroupLayout',
            {
                pixels: new TextLayout(
                    {
                        texture: {

                        },
                        visibility: ShaderStage.COMPUTE,
                    },
                    'texture_2d<f32>'),
                positions: new BufLayout(
                    {
                        buffer: {
                            hasDynamicOffset: false,
                            minBindingSize: 48,
                            type: 'storage',
                        },
                        visibility: ShaderStage.COMPUTE,

                    },
                    Vertices),
            })
    ] as const;

    const pipelineLayout = new PipelineLayout({
        bindGroupLayouts: bindLayouts,
        label: 'CreateGroundFromHeightMapPipeline',
    });
    return [
        bindLayouts,
        new ComputeShader({
            entryPoints: {
                main: new ComputeShaderFunction('@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>',
                    pipelineLayout,
                    [
                        1,
                        1
                    ],
                    ([{ positions, pixels, }]) => /* wgsl */
                        `
            let coords=vec2<f32>(
                f32(GlobalInvocationID.x) * factor_x,
                f32(GlobalInvocationID.y) * factor_y
            );
            var position: vec3<f32> = vec3<f32>(
                coords.x - (${settings.size[0]}f / 2.0),
                0.0,
                f32((${settings.subdivisions[1]} - GlobalInvocationID.y)) * factor_y - (${settings.size[1]} / 2.0)
            );
        
           let gradient:f32 = dot(textureLoad(${pixels}, vec2<i32>(scaled_texture_size * coords.xy), 0), filt);    
        
           position.y = ${settings.minmax[0]} + f32(${settings.minmax[1] - settings.minmax[0]}) * gradient;
           //position.y = 10.0;
           ${positions.prop('vert')}[GlobalInvocationID.y * (${settings.subdivisions[0] + 1}) + GlobalInvocationID.x].position = position;
          
           ${positions.prop('vert')}[GlobalInvocationID.y * (${settings.subdivisions[0] + 1}) + GlobalInvocationID.x].uv = (position.xz + vec2<f32>(${settings.maxXZ})) / vec2<f32>(${settings.size[0]}, ${settings.size[1]});
           return;
            `),
            },
            gpu,
            label: 'CreateGroundFromHeightMap.comp',
        },
        () =>
        /* wgsl */ `
        const filt:vec4<f32> = vec4<f32>(0.3, 0.59, 0.11, 0.0); 

        const scaled_texture_size = vec2<f32>(${textureSize.width / settings.size[0]}, ${textureSize.height / settings.size[1]});
        
        const factor_x=f32(${settings.size[0] / settings.subdivisions[0]});
        const factor_y=f32(${settings.size[1] / settings.subdivisions[0]});`)
    ] as const;
}
export type GroundFromHeightMap = ReturnType<typeof CreateGroundFromHeightMap>