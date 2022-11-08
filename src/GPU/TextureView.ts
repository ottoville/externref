import type { Texture } from "./Texture.js";
import type { BindGroup } from "./BindGroup.js";
import { Bindable } from "./Bindable.js";

export class TextureView<T extends Texture = Texture> extends Bindable {
    //TODO: set private
    view: GPUTextureView;
    readonly #descriptor: GPUTextureViewDescriptor
    constructor(public texture: T, descriptor?: GPUTextureViewDescriptor) {
        super();
        this.#descriptor={
            label: texture.label+'View',
            ...descriptor
        }
        this.view = this.reCreate();
        texture.views.add(this);
    }
    reCreate(debug=false) {
        if(debug) {
            this.#descriptor.label = (this.#descriptor.label!)+'debug'
        }
        this.destroy();
        this.view = this.texture.texture.createView(this.#descriptor);
        return this.view;
    }
    getTextureBinding(bindGroup: BindGroup): GPUTextureView {
        this.bindGroups.add(bindGroup);
        return this.view;
    }
}