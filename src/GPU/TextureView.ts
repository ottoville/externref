import type { Texture } from "./Texture.js";
export class TextureView {
    view: GPUTextureView;
    constructor(public texture: Texture, private descriptor?: GPUTextureViewDescriptor) {
        this.view = this.reCreate();
        texture.views.add(this);
    }
    reCreate() {
        this.view = this.texture.texture.createView(this.descriptor);
        return this.view;
    }
}