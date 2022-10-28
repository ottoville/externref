import type { BindGroup } from "./BindGroup";

export abstract class Bindable {
    protected readonly bindGroups:Set<BindGroup>=new Set();
    destroy() {
        this.bindGroups.forEach(bindGroup => {
            bindGroup.destroy()
        })
    }
}