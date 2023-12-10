import { NumericUnit } from './UIRectangle.js';
import { type UIRectangleNodeProps } from './UIRectangleNode.js';

type ButtonProps = Omit<
  UIRectangleNodeProps,
  'bitmap' | 'borderSize' | 'UIRectangleProps'
> & {
  UIRectangleProps: Omit<
    UIRectangleNodeProps['UIRectangleProps'],
    'borderSize'
  >;
};

export function Button(props: ButtonProps): UIRectangleNodeProps {
  return {
    ...props,
    UIRectangleProps: {
      ...props.UIRectangleProps,
      borderSize: {
        height: 'auto',
        width: [8, NumericUnit.px],
      } as const,
    },
  };
}
