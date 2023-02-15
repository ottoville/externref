import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";

function createTextureForTextOnly(
    text: string,
    textUV: [topLeft: [number, number], topRight: [number, number], bottomRight: [number, number], bottomLeft: [number, number]],
    originalAspectRatio?: number) {
    //const copySource = new OffscreenCanvas(this.props.backgroundAsset.texture.width, this.props.backgroundAsset.texture.height);
    const copySource = new OffscreenCanvas(1, 1);
    const ctx = copySource.getContext("2d")
    if (!ctx) {
        throw new Error('Cant get 2d context for texture text');
    }
    const font = '80pt serif';
    ctx.textBaseline = "top";
    ctx.font = font;
    const measuredSize = ctx.measureText(text);

    const textSize = {
        width: measuredSize.width,
        height: measuredSize.actualBoundingBoxAscent + measuredSize.actualBoundingBoxDescent
    }
    const originalTextHeight = textSize.height;
    if (originalAspectRatio) {
        //Keep text aspect ratio normal
        const textAspectRatio = textSize.height / textSize.width;
        if (textAspectRatio > originalAspectRatio) {
            //need to add borders to left and right
            textSize.width = textSize.height / originalAspectRatio
        } else if (textAspectRatio < originalAspectRatio) {
            //need to add borders to top and bottom
            textSize.height = textSize.width * originalAspectRatio;
        }
    }
    copySource.width = textSize.width;
    copySource.height = textSize.height;

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
    return copySource;
}
export class UIRectangleText extends UIRectangle {
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
        const textUV: [
            topLeft: [number, number],
            topRight: [number, number],
            bottomRight: [number, number],
            bottomLeft: [number, number]] = [
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
