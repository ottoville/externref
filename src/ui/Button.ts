import { NumericUnit } from "./UIRectangle.js";
import { type UIRectangleNodeProps } from "./UIRectangleNode.js";

type ButtonProps = Omit<UIRectangleNodeProps, 'bitmap' | 'borderSize' | 'UIRectangleProps'> & { UIRectangleProps: Omit<UIRectangleNodeProps["UIRectangleProps"], 'borderSize'> }

const bitmap = fetch('/assets/button.webp').then(asset => asset.blob()).then(createImageBitmap);

export function Button(props: ButtonProps) {
    return {
        bitmap,
        ...props,
        UIRectangleProps: {
            ...props.UIRectangleProps,
            borderSize: {
                width: [8, NumericUnit.px],
                height: 'auto',
            } as const
        }
    }
}