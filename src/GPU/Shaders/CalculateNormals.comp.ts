import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { FloatArray } from './structs/Structs.js';
import type { Terrain } from '../../world/Terrain.js';
import { SlopesLayout } from './CreateTerrainTexture.comp.js';

type BindLayouts = readonly [
    BGLayout<[BufLayout<ShaderStage.COMPUTE, typeof FloatArray>]>,
    SlopesLayout,
]
export class CalculateNormals extends ComputeShader<
    { main: PipelineLayout },
    BindLayouts> {
    constructor(
        settings: typeof Terrain.settings,
        slopesLayout: SlopesLayout
    ) {
        const bindLayouts = [
            new BGLayout(slopesLayout.gpu, 'normalsBindGroupLayout',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                            hasDynamicOffset: false,
                            minBindingSize: 32
                        }
                    }, 'normals', FloatArray)),
            slopesLayout
        ] as const

        const pipelineLayout = new PipelineLayout({
            label: 'calculateNormalsPipeline',
            bindGroupLayouts: bindLayouts
        });

        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            label: 'CalculateNormals.comp',
            entryPoints: {
                main: pipelineLayout
            },
            gpu: pipelineLayout.gpu
        });
        const facetSize = settings.subdivisions[0] * settings.subdivisions[1]
        this.createWGSL(([normals], [/*slopes*/, facet12]) => {
            /////////////////
            return /* wgsl */ `
   @compute @workgroup_size(1)
   fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
       let stride : u32 = 12u;
   
       let i:u32 = GlobalInvocationID.y * stride;
       let j:u32 = GlobalInvocationID.x * ${settings.subdivisions[0] + 1} * stride;
   
       let rows:u32 = GlobalInvocationID.x * ${settings.subdivisions[0]};
       let last_y:u32=GlobalInvocationID.y - 1u;
       
       let norm1:vec3<f32> = ${facet12.variableName}.plane[rows +  GlobalInvocationID.y].norm;
       let norm2:vec3<f32> = ${facet12.variableName}.plane[${facetSize} +  (rows +  GlobalInvocationID.y)].norm;
       let norm4:vec3<f32> = ${facet12.variableName}.plane[${facetSize} +  rows +  last_y].norm;
       let last_x:u32 = GlobalInvocationID.x - 1u;
       let norm5:vec3<f32> = ${facet12.variableName}.plane[last_x * ${settings.subdivisions[0]} +  GlobalInvocationID.y].norm;
       let norm7:vec3<f32> = ${facet12.variableName}.plane[last_x * ${settings.subdivisions[0]} +  last_y].norm;
       let norm8:vec3<f32> = ${facet12.variableName}.plane[${facetSize} + last_x * ${settings.subdivisions[0]} +  last_y].norm;
   
       let normalized:vec3<f32> = normalize(norm1 + norm2 + norm4 + norm5 + norm7 + norm8);
       
       //1 and 2
       //1 and 3   close   1
       //1 and 4
       //1 and 5
       //1 and 6   close 1
       //1 and 7   close 1
       //1 and 8
       //2 and 3   close 2
       //2 and 4   close 3
       //2 and 5   close 1
       //2 and 6   close 1
       //2 and 7   close 1
       //2 and 8   close 1
       //3 and 4   close 1
       //3 and 5   close 2
       //3 and 6   VERY CLOSE
       //3 and 7   close 1
       //3 and 8   close 1
       //4 and 5   close 3
       //4 and 6   close 1
       //4 and 7   close 1
       //4 and 8   close 1
       //5 and 6   far
       //5 and 7   close 1
       //5 and 8   far
       //6 and 7   far
       //6 and 8   close 1
       //7 and 8   far
       
   
       ${normals.prop('numbers')}[j + i + 4u]=normalized.x;
       ${normals.prop('numbers')}[j + i + 5u]=normalized.y;
       ${normals.prop('numbers')}[j + i + 6u]=normalized.z;
      
       return;
    }
      `;

            /////////////////////////////////
        });
    }
}