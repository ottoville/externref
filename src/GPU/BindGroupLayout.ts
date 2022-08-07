import type { GPU } from "../GPU.js";
import { BindGroup } from "./BindGroup.js";


//TODO: Merge layoutgroupdrawable here
//@ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface GPUBindGroupTextureEntry<SampleType = 'float'> extends GPUBindGroupEntry {
    resource: GPUTextureView;
}
type MapToGPUBindGroupEntry<T> = {
    [K in keyof T]:  T[K] extends GPUBindGroupTextureEntry ? {binding: GPUIndex32, resource: GPUTextureView} : GPUBindGroupEntry };
    
export class BindGroupLayout<T extends GPUBindGroupEntry[] = GPUBindGroupEntry[]> {
    layout: GPUBindGroupLayout;
    dynamicIndices=false;
    static create<T extends GPUBindGroupLayoutEntry[]>(gpu:GPU, label:string,...entries: T):
        BindGroupLayout<{ [K in keyof T]: T[K] extends {texture:GPUTextureBindingLayout} ? GPUBindGroupTextureEntry<T[K]['texture']['sampleType']>:GPUBindGroupEntry }> {
        return new BindGroupLayout(gpu, {label, entries})
    }
    constructor(private gpu:GPU, entry:GPUBindGroupLayoutDescriptor|GPUBindGroupLayout) {
        if(entry instanceof GPUBindGroupLayout)
            this.layout = entry
        else {
            this.layout = gpu.device.createBindGroupLayout(entry);
            for (const e of entry.entries) {
                if(e.buffer && e.buffer.hasDynamicOffset) {
                    this.dynamicIndices=true;
                    break;
                }
            }
        }
    }
    createBindGroup(label: string, entries: (bindGroup: BindGroup) => MapToGPUBindGroupEntry<T>): BindGroup {
        return new BindGroup(this.gpu, this, label,entries)
        /*const bindGroup = this.gpu.device.createBindGroup({
            layout: this.layout,
            entries,
            label
        });
        this.gpu.GPUBindGroupLayouts.set(bindGroup, this);
        return bindGroup*/
    } 
}