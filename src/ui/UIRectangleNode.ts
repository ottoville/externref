import { ButtonSize, UIRectangle } from "./UIRectangle.js";
import type { Terrain } from "../world/terrain.js";
import type { GPU } from "../GPU.js"
import { UINode } from "./UINode.js";

export type UIRectangleNodeProps = {
    gpu: GPU,
    terrain: Terrain,
    bitmap: ImageBitmap,
    label: string,
    scale: ButtonSize,
    translate: { x: number, y: number },
    text: string,
    open: boolean,
    menuTree: {level: number}
    onClick?: (menuName: string) => void
    children?: ({
        ctr: new(props:UIRectangleNodeProps) => UIRectangleNode;
        props: UIRectangleNodeProps;
    } | null)[] | null
}
export class UIRectangleNode<P extends UIRectangleNodeProps = UIRectangleNodeProps, S extends object = object> extends UINode<Readonly<P>, S> {
    static createCtrProps(props: UIRectangleNodeProps) {
        return {
            ctr: UIRectangleNode,
            props
        }
    }
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
    destroy() {
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
                originalAspectRatio: 0.3,
                events: {
                    onClick: () => {
                        if(this.props.onClick) {
                            this.props.onClick(props.text)
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