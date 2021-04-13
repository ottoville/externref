import type { GPU } from "../GPU.js";
//TODO: Merge layoutgroupdrawable here
//@ts-ignore
export class BindGroupLayout<T extends GPUBindGroupEntry[]> {
    layout: GPUBindGroupLayout;
    constructor(gpu:GPU, entry:GPUBindGroupLayoutDescriptor,public dynamicIndices?:number[]) {
        this.layout = gpu.device.createBindGroupLayout(entry);
    }
}