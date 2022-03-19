import type { Texture } from "./Texture.js";
import { GPU } from "../GPU.js";

export class TextureView {
    view: GPUTextureView;
    constructor(public texture: Texture, private descriptor?: GPUTextureViewDescriptor) {
        this.descriptor={
            label: texture.label+'View',
            ...this.descriptor
        }
        this.view = this.reCreate();
        texture.views.add(this);
    }
    reCreate() {
        const bindGroups = GPU.bindMap.get(this.view);
        if(bindGroups) {
            bindGroups.forEach(bg => {
                bg.dirty = true;
            })
        }
        this.view = this.texture.texture.createView(this.descriptor);
        return this.view;
    }
}