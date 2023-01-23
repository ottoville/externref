import { type DrawableNode } from "../../MainNode.js";
import { Drawable, DrawableProps } from "./Drawable.js";

export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    abstract node: DrawableNode
    constructor(
        drawableProps: DrawableProps,
        {
            instanceCount = 1,
        }:
            {
                instanceCount: number;
            }
    ) {
        super(drawableProps);
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
    }
    set instanceCount(count: number) {
        if (count === this.#instanceCount)
            return;
        this.#instanceCount = count;
        this.clearBundles();
    }
    get instanceCount() {
        return this.#instanceCount;
    }
}