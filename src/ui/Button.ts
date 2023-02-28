import { NumericUnit } from "./UIRectangle.js";
import { UIRectangleNode, type UIRectangleNodeProps } from "./UIRectangleNode.js";

export type ButtonProps = Omit<UIRectangleNodeProps, 'bitmap' | 'borderSize'>;

/*export type ButtonCtr = {
    new (props: ButtonProps): UIRectangleNode;
} & Omit<typeof UIRectangleNode, 'new'>
*/
const bitmap = fetch('/assets/button.webp').then(asset => asset.blob()).then(createImageBitmap);

export class Button<S extends object = object, P extends ButtonProps = ButtonProps> extends UIRectangleNode<S, UIRectangleNodeProps & P> {
    constructor(props: ButtonProps) {
        super({
            bitmap,
            borderSize: {
                width: [8, NumericUnit.px],
                height: 'auto',
            } as const,
            ...props
        } as UIRectangleNodeProps & P);
    }
}