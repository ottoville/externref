import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";
import type { GPU } from "../GPU.js"
import { UINode } from "./UINode.js";
import { UIRectangleBackground } from "./UIRectangleBackground.js";
import { UIRectangleTextOnly } from "./UIRectangleTextOnly.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

export type UIRectangleNodeProps = {
    UIRectangleProps: Omit<UIRectangleProps, "canvaspipeline" | "renderPass">,
    gpu: GPU,
    bitmap?: ImageBitmap | Promise<ImageBitmap> | undefined,
    text: string,
    onClick?: ((menuName?: string) => void) | undefined
    children?: (ReturnType<typeof UINode["createCtrProps"]> | null)[] | null | undefined
}
export class UIRectangleNode<S extends object = object, P extends UIRectangleNodeProps = UIRectangleNodeProps> extends UINode<P, S> {
    static instances: Map<UINode, UIRectangleNode> = new Map()
    static getInstance<P extends UIRectangleNodeProps>(host: UINode, props: P): UIRectangleNode {
        let instance = UIRectangleNode.instances.get(host);
        if (!instance) {
            instance = new UIRectangleNode(props);
            UIRectangleNode.instances.set(host, instance)
        }
        return instance;
    }
    constructor(props: P) {
        super(props);
    }
    #instance?: Promise<UIRectangle> | UIRectangle;
    override destroy() {
        super.destroy();
        if (this.#instance) {
            if (this.#instance instanceof UIRectangle) {
                this.#instance.destroy();
            } else {
                this.#instance.then(instance => instance.destroy()).catch(err => engine.showError(err));
            }
        }
    }
    createBackgroundInstance(commonProps: UIRectangleProps, bitmap: ImageBitmap) {
        return new UIRectangleBackground(commonProps, {
            texture: bitmap,
            border_width: 0.2,
            border_height: 0.2
        }, this.props.text);
    }
    render() {
        const { gpu, onClick, bitmap, text, children } = this.props
        const commonProps: UIRectangleProps = {
            canvaspipeline: gpu.UIPipeline,
            renderPass: gpu.renderPassCanvas,
            ...this.props.UIRectangleProps,
        }
        if (onClick) {
            commonProps.events = {
                onClick: () => {
                    onClick(this.props.UIRectangleProps.label)
                }
            }
        }
        if (!this.#instance) {
            if (bitmap) {
                if (bitmap instanceof ImageBitmap) {
                    this.#instance = this.createBackgroundInstance(commonProps, bitmap);
                } else {
                    this.#instance = bitmap.then(bitmap2 => {
                        //Replace promise with resolved value;
                        this.#instance = this.createBackgroundInstance(commonProps, bitmap2);
                        return this.#instance;
                    });
                }
            } else {
                this.#instance = new UIRectangleTextOnly(commonProps, text);
            }
        } else if (this.#instance instanceof UIRectangleBackground || this.#instance instanceof UIRectangleTextOnly) {
            if (text !== this.#instance.text) {
                this.#instance.text = text;
                this.#instance.createTexture()
            }
        }
        if (children) {
            return children;
        }
        return null
    }
}