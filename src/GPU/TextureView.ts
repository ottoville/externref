import type { Texture } from "./texture";

export class TextureView {
    view: GPUTextureView;
    resolveView?: GPUTextureView;
    constructor(private texture: Texture, private descriptor?: GPUTextureViewDescriptor) {
        this.view = this.reCreate();
        texture.views.add(this);
    }
    reCreate() {
        this.view = this.texture.texture.createView(this.descriptor);
        if(this.texture.resolveTexture) {
            this.resolveView = this.texture.resolveTexture.createView(this.descriptor);
            this.texture.resolveViews.add(this);
        }
        return this.view;
    }
}