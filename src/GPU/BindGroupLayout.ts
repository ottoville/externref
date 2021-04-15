import type { GPU } from "../GPU.js";
//TODO: Merge layoutgroupdrawable here
//@ts-ignore
export class BindGroupLayout<T extends GPUBindGroupEntry[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices=false;
    constructor(gpu:GPU, entry:GPUBindGroupLayoutDescriptor) {
        this.layout = gpu.device.createBindGroupLayout(entry);
        for (const e of entry.entries) {
            if(e.buffer && e.buffer.hasDynamicOffset) {
                this.dynamicIndices=true;
                break;
            }
        }
    }
}