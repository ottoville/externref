import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";
import type { GPU } from "../GPU.js"
import { UINode } from "./UINode.js";

export type UIRectangleNodeProps = {
    gpu: GPU,
    bitmap: ImageBitmap,
    text: string,
    onClick: (menuName?: string) => void
    children?: ({
        ctr: new(props:UIRectangleNodeProps) => UIRectangleNode;
        props: UIRectangleNodeProps;
    } | null)[] | null
} & Pick<UIRectangleProps, 'scale' | 'translate' | 'label' | 'originalAspectRatio'>
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
    #instance?: UIRectangle;
    override destroy() {
        super.destroy();
        this.#instance?.destroy();
    }
    render() {
        const props = this.props;
        if(!this.#instance) {
            this.#instance = new UIRectangle({
                canvaspipeline: props.gpu.UIPipeline,
                renderPass: props.gpu.renderPassCanvas,
                label: props.label,
                borderSize: { width: 0.01, height: 'auto', texture_width: 0.2, texture_height: 0.2 },
                backgroundTexture: props.bitmap,
                scale: props.scale,
                translate: props.translate,
                originalAspectRatio: props.originalAspectRatio,
                events: {
                    onClick: () => {
                        if(this.props.onClick) {
                            this.props.onClick(props.label)
                        }
                    }
                },
                text: props.text
            });
        }
        if(props.children) {
            return props.children;
        }
        return null
    }
}