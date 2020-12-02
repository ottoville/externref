import { Physics } from "./physics";
import type { GPU } from "./GPU";
import type { DynamicBindGroupLayout } from "./GPU/BindGroupLayout";

export class Engine {
    physics = new Physics(this);
    positionBindGroupTime: DynamicBindGroupLayout<[number]>;
    calculatePickingRaysPipeline: TerraGPUComputePipeLine;
    bindgrouplayout1: GPUBindGroupLayout;

    constructor(gpu: GPU) {
        this.positionBindGroupTime = gpu.rootSceneLayout.addChildBindGroup(gpu.BindGroup, true);
        this.positionBindGroupTime.onRender = async (time) => {
            return gpu.updateGPUBuffer();
        }
        const pickingRayLayout = gpu.createBindGroupLayout(
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                type: "readonly-storage-buffer"
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                type: "readonly-storage-buffer"
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                type: "storage-buffer"
            });
        this.calculatePickingRaysPipeline = gpu.createComputePipeline("calculatePickingRays.comp", gpu.device.createPipelineLayout({
            bindGroupLayouts: [pickingRayLayout]
        }));
        this.bindgrouplayout1 = gpu.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "storage-buffer"
                }]
        })
    }

}