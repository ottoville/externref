import type { GPU } from "../GPU.js";
import { RenderTarget } from "../GPU/RenderTarget.js";
import {GPUTextureUsageLiterals, Texture } from "../GPU/texture.js";


//TODO: Merge layoutgroupdrawable here
//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface GPUBindGroupTextureEntry<SampleType = 'float'> extends GPUBindGroupEntry {
    resource: GPUTextureView;
}
type RenderTargetView =
{
    binding: number,
    resource: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> | GPUTextureView
};
type MapToGPUBindGroupEntry<T> = {
    [K in keyof T]:  T[K] extends GPUBindGroupTextureEntry ? RenderTargetView : GPUBindGroupEntry };
export class BindGroupLayout<T extends GPUBindGroupEntry[] = GPUBindGroupEntry[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices=false;
    static create<T extends GPUBindGroupLayoutEntry[]>(gpu:GPU, label:string,...entries: T):
        BindGroupLayout<{ [K in keyof T]: T[K] extends {texture:GPUTextureBindingLayout} ? GPUBindGroupTextureEntry<T[K]['texture']['sampleType']>:GPUBindGroupEntry }> {
        return new BindGroupLayout(gpu, {label, entries})
    }
    constructor(private gpu:GPU, entry:GPUBindGroupLayoutDescriptor) {
        this.layout = gpu.device.createBindGroupLayout(entry);
        for (const e of entry.entries) {
            if(e.buffer && e.buffer.hasDynamicOffset) {
                this.dynamicIndices=true;
                break;
            }
        }
    }
    createBindGroup(entries: MapToGPUBindGroupEntry<T>): GPUBindGroup {
        //createBindGroup(layout: BindGroupLayout<GPUBindGroupEntry[]>, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.gpu.device.createBindGroup({
            layout: this.layout, entries
        });
        this.gpu.GPUBindGroupLayouts.set(bindGroup, this);
        return bindGroup
    }
    createBindGroupForRenderPass(entries: MapToGPUBindGroupEntry<T>): GPUBindGroup {
        const bindGroup = this.gpu.device.createBindGroup({
            layout: this.layout, entries: (entries as GPUBindGroupEntry[]).map<GPUBindGroupEntry>(entry => {
                if (entry.resource instanceof RenderTarget) {
                    entry.resource = entry.resource.view;
                }
                return entry as GPUBindGroupEntry;
            })
        });
        this.gpu.GPUBindGroupLayouts.set(bindGroup, this);
        return bindGroup
    }    
}