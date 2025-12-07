import type { UIRectangleProps } from './UIRectangle.js';
import { createBackground, font } from './UIRectangleBackground.js';
import { UIRectangleText } from './UIRectangleText.js';

export type TextUV = [
  topLeft: [number, number],
  topRight: [number, number],
  bottomRight: [number, number],
  bottomLeft: [number, number],
];
function createTextureForTextOnly(
  text: string,
  textUV: [
    topLeft: [number, number],
    topRight: [number, number],
    bottomRight: [number, number],
    bottomLeft: [number, number],
  ],
  originalAspectRatio?: number,
) {
  const { originalTextHeight, textSize, measuredSize, ctx, copySource2 } =
    createBackground(1, 1, text, originalAspectRatio);

  copySource2.width = textSize.width;
  copySource2.height = textSize.height;

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const verticalTextMargin = textSize.height - originalTextHeight;
  ctx.fillText(
    text,
    textSize.width * 0.5,
    measuredSize.actualBoundingBoxAscent + verticalTextMargin * 0.5,
  );
  // copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })

  textUV[0] = [0, 0];
  textUV[1] = [textSize.width, 0];
  textUV[2] = [textSize.width, textSize.height];
  textUV[3] = [0, textSize.height];
  return copySource2;
}
interface UIRectangleTextOnlyProps extends UIRectangleProps {
  text: string;
}
export class UIRectangleTextOnly extends UIRectangleText {
  createTexture() {
    const copySource = createTextureForTextOnly(
      this.props.text,
      this.textUV,
      this.props.originalAspectRatio,
    );
    return this.createTextureView(copySource, this.textUV);
  }
  textUV: [
    topLeft: [number, number],
    topRight: [number, number],
    bottomRight: [number, number],
    bottomLeft: [number, number],
  ];
  constructor(public override props: UIRectangleTextOnlyProps) {
    const textUV: [
      topLeft: [number, number],
      topRight: [number, number],
      bottomRight: [number, number],
      bottomLeft: [number, number],
    ] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    super(
      props,
      createTextureForTextOnly(props.text, textUV, props.originalAspectRatio),
      textUV,
    );
    this.textUV = textUV;
  }
}
