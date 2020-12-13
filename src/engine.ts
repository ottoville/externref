import { Physics } from "./physics";
import type { GPU } from "./GPU";
import type { DynamicBindGroupLayout } from "./GPU/BindGroupLayout";
import { TerraNode } from "./TerraNode";

export class Engine {
    physics = new Physics(this);
    positionBindGroupTime: DynamicBindGroupLayout<[number]>;
    calculatePickingRaysPipeline: TerraGPUComputePipeLine;
    bindgrouplayout1: GPUBindGroupLayout;

    constructor(public gpu: GPU, public DB: Promise<EarthDatabase>) {
        this.positionBindGroupTime = gpu.rootSceneLayout.addChildBindGroup(gpu.BindGroup, true);
        
        gpu.onRenders2.push(() => {
            if (gpu.queue.size === 0)
                return null
            const dataSizeBytes = TerraNode.GPUDataSize * 4; //4 * 16 + 3 * 4;
            const tempBuffer = gpu.createGPUBuffer(dataSizeBytes * gpu.queue.size, [GPUBufferUsage.COPY_SRC], true);
            let tempOffset = 0;
            const commandEncoder = gpu.device.createCommandEncoder();
            gpu.queue.forEach((bufferOffset, matrix) => {
                new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(matrix);
                commandEncoder.copyBufferToBuffer(
                    tempBuffer, tempOffset++ * dataSizeBytes,
                    gpu.GPUData, bufferOffset,
                    dataSizeBytes);
            });
            tempBuffer.unmap();
            gpu.queue.clear();
            return commandEncoder.finish();
        })
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