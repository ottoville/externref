import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import type { GPU } from 'GPU.js';
import { FragmentShaderFunction } from './ShaderFunction.js';
import { WaterInput, diffuseOutput } from './structs/Structs.js';
type BindLayouts = GPU['bindGroupTextureWater']['bindGroupLayouts']

export function createWaterFragShader(pipelineLayout: PipelineLayout<BindLayouts>) {
    return new FragmentShader(
        {
            entryPoints: {
                main: new FragmentShaderFunction(
                    diffuseOutput,
                    pipelineLayout,
                    WaterInput,
                    ([
                        /*{ uniforms, }*/,
                        /*{ scene, clusters_array, meshes, projection, }*/,
                        /*{ world, }*/,
                        { mySampler, diffuseTexture, }
                    ]) =>
                    /* wgsl */ `                
                    var output:Output;
                    let uv : vec2<f32> = vec2<f32>(v_uv.x/v_uv.w , (v_uv.y/v_uv.w))*0.5+vec2<f32>(0.5,0.5);
                
                    output.Diffuse=textureSample(${diffuseTexture}, ${mySampler}, uv);
                
                    return output;
        
                `),
            },
            gpu: pipelineLayout.gpu,
            label: 'Water.frag',
        }
    );
}
export type WaterFragShader = ReturnType<typeof createWaterFragShader>;
