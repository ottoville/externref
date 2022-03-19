import { GPU } from "../GPU.js";

export class BindGroup {
    dirty=true;
    #bindGroup: GPUBindGroup;
    get bindGroup() {
        if(this.dirty) {
            const entries=this.entriesf();
            this.#bindGroup = this.gpu.device.createBindGroup({
                layout: this.layout,
                entries,
                label: this.label
            });
            this.dirty=false;
            for(const entry of entries) {
                let arr = GPU.bindMap.get(entry.resource);
                if(!arr) {
                    arr=[] as BindGroup[];
                    GPU.bindMap.set(entry.resource,arr);
                }
                arr.push(this);
            }
        }
        return this.#bindGroup;
    }
    constructor(private gpu: GPU, private layout:  GPUBindGroupLayout, private label: string, private entriesf: () => Iterable<GPUBindGroupEntry>) {
        this.#bindGroup=this.bindGroup;
    }
}