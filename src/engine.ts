import { Physics } from "./physics";
import type { GPU } from "./GPU";
import type { DynamicBindGroupLayout } from "./GPU/BindGroupLayout";

export class Engine {
    physics = new Physics(this);
    positionBindGroupTime: DynamicBindGroupLayout<[number]>;
    constructor(gpu: GPU) {
        this.positionBindGroupTime = gpu.addBindGroup(gpu.BindGroup, true);
        this.positionBindGroupTime.onRender = async (time) => {
            return gpu.updateGPUBuffer();
        }
    }

}