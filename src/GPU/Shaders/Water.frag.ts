import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from "GPU.js"
import { FragmentShaderFunction } from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';
type BindLayouts = GPU["bindGroupTextureWater"]["bindGroupLayouts"]
export class WaterFragShader extends FragmentShader<BindLayouts> {
    constructor(pipelineLayout: PipelineLayout<BindLayouts>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: new FragmentShaderFunction(new Struct('Output', {
                    Diffuse: ['@location(0)', 'vec4<f32>'],
                }),
                pipelineLayout,
                `@location(0) v_uv : vec4<f32>,
                @location(1) position : vec3<f32>,
                @location(2) @interpolate(flat) id : u32`, ([
                    [/*uniforms*/,],
                    [/*scene, time, clusters_array, meshes, projection*/,],
                    [/*world*/,],
                    [mySampler, diffuseTexture,]
                ]) => /* wgsl */ `                
                    var output:Output;
                    let uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);
                
                    output.Diffuse=textureSample(${diffuseTexture}, ${mySampler}, uv);
                
                    return output;
        
                `),
            },
            label: 'Water.frag',
            gpu: pipelineLayout.gpu
        });
    }
}