import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";
import { createBackground, font } from "./UIRectangleBackground.js";

export type TextUV = [
    topLeft: [number, number],
    topRight: [number, number],
    bottomRight: [number, number],
    bottomLeft: [number, number]];
function createTextureForTextOnly(
    text: string,
    textUV: [topLeft: [number, number], topRight: [number, number], bottomRight: [number, number], bottomLeft: [number, number]],
    originalAspectRatio?: number) {

    const { originalTextHeight, textSize, measuredSize, ctx, copySource2 } = createBackground(1, 1, text, originalAspectRatio)

    copySource2.width = textSize.width;
    copySource2.height = textSize.height;

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const verticalTextMargin = textSize.height - originalTextHeight;
    ctx.fillText(
        text,
        textSize.width * 0.5,
        measuredSize.actualBoundingBoxAscent + verticalTextMargin * 0.5);
    // eslint-disable-next-line promise/catch-or-return
    // copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })

    textUV[0] = [0, 0];
    textUV[1] = [textSize.width, 0];
    textUV[2] = [textSize.width, textSize.height];
    textUV[3] = [0, textSize.height];
    return copySource2;
}
export class UIRectangleTextOnly extends UIRectangle {
    createTexture() {
        const copySource = createTextureForTextOnly(this.text, this.textUV, this.props.originalAspectRatio)
        this.createTextureView(copySource);
        return this.textureView;
    }
    override updateBoundingBoxAndVertices({ vertices, content_sizeX, content_sizeY }: {
        vertices: Float32Array;
        content_sizeX: number;
        content_sizeY: number;
        outer_sizeX: number;
        outer_sizeY: number;
    }) {
        vertices.set([
            //bottom left
            -content_sizeX, -content_sizeY, ...this.textUV[3],
            //bottom right
            content_sizeX, -content_sizeY, ...this.textUV[2],
            //top left
            -content_sizeX, content_sizeY, ...this.textUV[0],

            //top left
            -content_sizeX, content_sizeY, ...this.textUV[0],
            //bottom right
            content_sizeX, -content_sizeY, ...this.textUV[2],
            //top right
            content_sizeX, content_sizeY, ...this.textUV[1]
        ]);
        return vertices;
    }
    private textUV: [
        topLeft: [number, number],
        topRight: [number, number],
        bottomRight: [number, number],
        bottomLeft: [number, number]]
    constructor(public override props: UIRectangleProps, public text: string) {
        const textUV: TextUV = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
        ]
        super(props, createTextureForTextOnly(text, textUV, props.originalAspectRatio))
        this.textUV = textUV;
        const {
            label,
            borderSize,
        } = props;
        this.positions_count = (borderSize.width[0] > 0 || borderSize.height[0] > 0) ? 54 : 6;
        this.label = label + '_UIRectangle';
    }
}
