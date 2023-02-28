import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";
import type { GPU } from "../GPU.js"
import { UINode } from "./UINode.js";
import { UIRectangleBackground } from "./UIRectangleBackground.js";
import { UIRectangleTextOnly } from "./UIRectangleTextOnly.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

export type UIRectangleNodeProps = {
    gpu: GPU,
    bitmap?: ImageBitmap | Promise<ImageBitmap> | undefined,
    text: string,
    onClick?: ((menuName?: string) => void) | undefined
    children?: (ReturnType<typeof UINode["createCtrProps"]> | null)[] | null | undefined
} & Pick<UIRectangleProps, 'scale' | 'translate' | 'label' | 'originalAspectRatio' | 'borderSize'>
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
        const props = this.props;
        const commonProps: UIRectangleProps = {
            canvaspipeline: props.gpu.UIPipeline,
            renderPass: props.gpu.renderPassCanvas,
            label: props.label,
            borderSize: props.borderSize,
            scale: props.scale,
            translate: props.translate,
            originalAspectRatio: props.originalAspectRatio,
            events: {
                onClick: () => {
                    if (this.props.onClick) {
                        this.props.onClick(props.label)
                    }
                }
            }
        }
        if (!this.#instance) {
            if (props.bitmap) {
                if (props.bitmap instanceof ImageBitmap) {
                    this.#instance = this.createBackgroundInstance(commonProps, props.bitmap);
                } else {
                    this.#instance = props.bitmap.then(bitmap => {
                        //Replace promise with resolved value;
                        this.#instance = this.createBackgroundInstance(commonProps, bitmap);
                        return this.#instance;
                    });
                }
            } else {
                this.#instance = new UIRectangleTextOnly(commonProps, props.text);
            }
        } else if (this.#instance instanceof UIRectangleBackground || this.#instance instanceof UIRectangleTextOnly) {
            if (props.text !== this.#instance.text) {
                this.#instance.text = props.text;
                this.#instance.createTexture()
            }
        }
        if (props.children) {
            return props.children;
        }
        return null
    }
}