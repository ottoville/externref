import { BGLayout, BufLayout, ShaderStage } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { ComputeShader } from './ComputeShader.js';
import { Indices } from './structs/Structs.js';

type BindLayouts = readonly [BGLayout<[BufLayout<ShaderStage.COMPUTE>]>,
BGLayout<[BufLayout<ShaderStage.COMPUTE>]>];
export class CalculatePlaneIndices extends ComputeShader<{ main: PipelineLayout }, BindLayouts> {
  constructor(settingsLayout: BGLayout<[BufLayout<ShaderStage.COMPUTE>]>) {
    const bindLayouts = [
      settingsLayout,
      new BGLayout(settingsLayout.gpu, 'calculateIndicesBindGroupLayout',
        new BufLayout(
          {
            visibility: ShaderStage.COMPUTE,
            buffer: {
              type: "storage",
              hasDynamicOffset: false,
              minBindingSize: 32
            }
          }, 'indices', Indices))
    ] as const

    const pipelineLayout = new PipelineLayout({
      label: 'calculatePlaneIndicesPipeline',
      bindGroupLayouts: bindLayouts
    });
    super({
      bindGroupLayouts: pipelineLayout.bindGroupLayouts,
      label: "calculatePlaneIndices.comp",
      entryPoints: {
        main: pipelineLayout
      }
    })
    this.createWGSL(([settings],[indices]) => {
      return /* wgsl */ `

      @compute @workgroup_size(1)
      fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
        let idx1: u32 = (GlobalInvocationID.x + u32(1) + (GlobalInvocationID.y + u32(1)) * (${settings.variableName}.subdivisions + u32(1)));
        let idx2: u32 = (GlobalInvocationID.x + u32(1) + GlobalInvocationID.y * (${settings.variableName}.subdivisions + u32(1)));
        let idx3: u32 = (GlobalInvocationID.x + GlobalInvocationID.y * (${settings.variableName}.subdivisions + u32(1)));
        let idx4: u32 = (GlobalInvocationID.x + (GlobalInvocationID.y + u32(1)) * (${settings.variableName}.subdivisions + u32(1)));
        let index:u32 = GlobalInvocationID.y*${settings.variableName}.subdivisions*u32(6) + GlobalInvocationID.x*u32(6);
        ${indices.variableName}.numbers[index] = idx1;
        ${indices.variableName}.numbers[index+u32(1)]=idx2;
        ${indices.variableName}.numbers[index+u32(2)]=idx3;
      
        ${indices.variableName}.numbers[index+u32(3)]=idx4;
        ${indices.variableName}.numbers[index+u32(4)]=idx1;
        ${indices.variableName}.numbers[index+u32(5)]=idx3;
        return;
      }
      `;
    })
  }
}