import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { IntArray, PlaneArray, Vertices } from './structs/Structs.js';
import type { GPU } from '../../GPU.js'
import type { Terrain } from '../../world/terrain.js';


type BindLayouts = readonly [
    BGLayout<[BufLayout<ShaderStage.COMPUTE>]>,
    BGLayout<[BufLayout<ShaderStage.COMPUTE>, BufLayout<ShaderStage.COMPUTE>]>,
];
export class CalculatePlaneHeights extends ComputeShader<{ main: PipelineLayout }, BindLayouts> {
    constructor(gpu: GPU, settings: typeof Terrain.settings) {
        const bindLayouts = [
            new BGLayout(gpu, 'verticesBindGroupLayout',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                            hasDynamicOffset: false,
                            minBindingSize: 48
                        }
                    }, 'vertices', Vertices)),
            new BGLayout(gpu, 'slopesAndFacesBindGroupLayout',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                            hasDynamicOffset: false,
                            minBindingSize: 32
                        },
                    }, 'slopes', IntArray),
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "storage",
                            hasDynamicOffset: false,
                            minBindingSize: 32
                        }
                    }, 'facet12', PlaneArray))
        ] as const

        const pipelineLayout = new PipelineLayout({
            label: 'calculatePlaneHeightsPipeline',
            bindGroupLayouts: bindLayouts
        });
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            label: "calculatePlaneHeights.comp",
            entryPoints: {
                main: pipelineLayout
            }
        })
        const subdivisions_plus_one = settings.subdivisions[0] + 1;
        const facetSize = settings.subdivisions[0] * settings.subdivisions[1]
        this.createWGSL(([vertices], [slopes, facet12]) => {
            return /* wgsl */ `
      const cd: f32 = -1.0;
      @compute @workgroup_size(1)
      fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
      
          let next:vec2<u32> = vec2<u32>(GlobalInvocationID.x + u32(1),GlobalInvocationID.y + u32(1));
      
          let idx1:u32 = (next.x + next.y * ${subdivisions_plus_one});
          let idx2:u32 = (next.x + GlobalInvocationID.y * ${subdivisions_plus_one});
          let idx3:u32 = (GlobalInvocationID.x + GlobalInvocationID.y * ${subdivisions_plus_one});
          let idx4:u32 = (GlobalInvocationID.x + next.y * ${subdivisions_plus_one});
      
      
          //calculateHeightSquad(row, col);
          let i:u32 = GlobalInvocationID.y;
          let j:u32 = GlobalInvocationID.x * ${subdivisions_plus_one};
          let k:u32 = next.x * ${subdivisions_plus_one};
      
      
          let v1arr:vec3<f32> = ${vertices.variableName}.vert[j + i].position;
          let v2arr:vec3<f32> =  ${vertices.variableName}.vert[j + i + u32(1)].position;
      
          let v1v3:vec3<f32> = ${vertices.variableName}.vert[k + i].position - v1arr;
          let v1v4:vec3<f32> = ${vertices.variableName}.vert[k + i + u32(1)].position - v1arr;
      
          //   cd = (terrainPositions[k + i + 2] - v1arr[2]) / (terrainPositions[k + i + 3] - v1arr[0]);
      
          let h:i32 = i32(v1arr.z - cd * v1arr.x);             // v1 belongs to the slope
      
          // facet equations :
          // we compute each facet normal vector
          // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
          // we compute the value d by applying the equation to v1 which belongs to the plane
          // then we store the facet equation in a Vector4
      
          let v1v2:vec3<f32> = v2arr - v1arr;
          let norm1:vec3<f32> = normalize(cross(v1v4, v1v3));
          let norm2:vec3<f32> = normalize(cross(v1v2, v1v4));
      
      
          ${slopes.variableName}.numbers[GlobalInvocationID.x * ${settings.subdivisions[0]} + GlobalInvocationID.y] = h;
      
          ${facet12.variableName}.plane[(GlobalInvocationID.x * ${settings.subdivisions[0]} +  GlobalInvocationID.y)].norm = norm1;
          ${facet12.variableName}.plane[(GlobalInvocationID.x * ${settings.subdivisions[0]} +  GlobalInvocationID.y)].d = dot(norm1,v1arr) * -1.0;
      
          ${facet12.variableName}.plane[${facetSize} +  (GlobalInvocationID.x * ${settings.subdivisions[0]} +  GlobalInvocationID.y)].norm = norm2;
          ${facet12.variableName}.plane[${facetSize} + (GlobalInvocationID.x * ${settings.subdivisions[0]} +  GlobalInvocationID.y)].d = dot(norm2,v2arr) * -1.0;
      
          return;
        }
        `;
        })
    }
}