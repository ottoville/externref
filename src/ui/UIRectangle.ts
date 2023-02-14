import type { RenderPass } from "../GPU/RenderPasses/RenderPass.js";
import { Buffer, type CopyDstBuffer, GPUBufferUsage } from "../GPU/Buffer/Buffer.js";
import { TextureView } from "../GPU/TextureView.js";
import type { Engine } from "../engine.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { TextureUsageEnums, TextureUsageValue } from "../GPU/Texture.js";
import { Texture2D, type Texture2dSize } from "../GPU/Texture2D.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
import type { RenderPipeline } from "../GPU/RenderPipeline2.js";
import type { UIVertShader } from "../GPU/Shaders/UI.vert.js";
declare const engine: Engine;

export const enum NumericUnit {
    px,
    '%'
}
export const enum Anchor {
    CENTER,
    TOP,
    BOTTOM,
    LEFT,
    RIGHT
}

export type ValueUnit = readonly [
    value: number,
    unit: NumericUnit
]

export type VerticalPosition = {
    value: ValueUnit
    anchor: Anchor.CENTER | Anchor.TOP | Anchor.BOTTOM
}
export type HorizontalPosition = {
    value: ValueUnit
    anchor: Anchor.CENTER | Anchor.LEFT | Anchor.RIGHT
}

export type ButtonSize = {
    min_width: number,
    /**
     * Ignored if originalAspectRatio is set
     */
    y: number,
    unit: NumericUnit
}

export type ButtonPosition = {
    x: HorizontalPosition,
    y: VerticalPosition,
}

export type UIRectangleProps = {
    canvaspipeline: RenderPipeline<UIVertShader>,
    renderPass: RenderPass,
    label: string,
    /**
        width: Relative width of borders to viewport, value between 0 and 1
        height: Relative height of borders to viewport, value between 0 and 1
                If "auto", it is calculated to be same than width
    */
    borderSize: {
        width: ValueUnit,
        height: ValueUnit | 'auto',
    },
    /**
        border_width: Relative width of border in texture UV mapping, between 0 and 1
        border_height: Relative height of border in texture UV mapping, between 0 and 1
     */
    backgroundAsset?: {
        texture: ImageBitmap | TextureView<Texture2D>,
        readonly border_width: number,
        readonly border_height: number
    } | undefined
    text?: string,
    /**
        Size of the button.
        Border size is taken account to scale.
        Y is Ignored if originalAspectRatio is set.
    */
    scale: ButtonSize,
    /**
     * Values between -1 and 1
     * Origin 0,0 is at center of the viewport,
     *  -1, 1 is left top
     */
    translate: ButtonPosition,
    originalAspectRatio?: number | undefined,
    events?: {
        onClick?: (e: PointerEvent) => void,
    }
};
/*
    Draws rectangle.
*/
export class UIRectangle {
    label: string;
    positions_count: number;

    drawable: DrawableSimple<RenderPipeline<UIVertShader>>;
    #boundingBox = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }
    texture?: RenderTarget<"bgra8unorm", (typeof TextureUsageEnums)["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST"]> | undefined;
    textureView: TextureView<Texture2D<GPUTextureFormat, TextureUsageValue>>;
    uniformBuffer: CopyDstBuffer & import("c:/Users/lamminpa/repos/terrasim/src/GPU/Buffer/Buffer").BindUniformBuffer;
    createTextureForTextOnly() {
        if (!this.props.text) {
            throw new Error('text is needed when no background');
        }
        //const copySource = new OffscreenCanvas(this.props.backgroundAsset.texture.width, this.props.backgroundAsset.texture.height);
        const copySource = new OffscreenCanvas(1, 1);
        const ctx = copySource.getContext("2d")
        if (!ctx) {
            throw new Error('Cant get 2d context for texture text');
        }
        const font = '80pt serif';
        ctx.textBaseline = "top";
        ctx.font = font;
        const measuredSize = ctx.measureText(this.props.text);

        const textSize = {
            width: measuredSize.width,
            height: measuredSize.actualBoundingBoxAscent + measuredSize.actualBoundingBoxDescent
        }
        const originalTextHeight = textSize.height;
        if (this.props.originalAspectRatio) {
            //Keep text aspect ratio normal
            const textAspectRatio = textSize.height / textSize.width;
            if (textAspectRatio > this.props.originalAspectRatio) {
                //need to add borders to left and right
                textSize.width = textSize.height / this.props.originalAspectRatio
            } else if (textAspectRatio < this.props.originalAspectRatio) {
                //need to add borders to top and bottom
                textSize.height = textSize.width * this.props.originalAspectRatio;
            }
        }
        copySource.width = textSize.width;
        copySource.height = textSize.height;

        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const verticalTextMargin = textSize.height - originalTextHeight;
        ctx.fillText(
            this.props.text,
            textSize.width * 0.5,
            measuredSize.actualBoundingBoxAscent + verticalTextMargin * 0.5);
        // eslint-disable-next-line promise/catch-or-return
        // copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })

        this.textUV[0] = [0, 0];
        this.textUV[1] = [textSize.width, 0];
        this.textUV[2] = [textSize.width, textSize.height];
        this.textUV[3] = [0, textSize.height];
        return copySource;
    }
    createTexture() {
        let copySource: ImageBitmap | OffscreenCanvas;
        if (!(this.props.backgroundAsset?.texture instanceof ImageBitmap)) {
            copySource = this.createTextureForTextOnly()
        } else {
            copySource = this.props.backgroundAsset.texture;
            // Create texture for text
            if (this.props.text) {
                copySource = new OffscreenCanvas(this.props.backgroundAsset.texture.width, this.props.backgroundAsset.texture.height);
                const ctx = copySource.getContext("2d")
                if (!ctx) {
                    throw new Error('Cant get 2d context for texture text');
                }
                const font = '80pt serif';
                ctx.textBaseline = "top";
                ctx.font = font;
                const measuredSize = ctx.measureText(this.props.text);

                const textSize = {
                    width: measuredSize.width,
                    height: measuredSize.actualBoundingBoxAscent + measuredSize.actualBoundingBoxDescent
                }
                const originalTextHeight = textSize.height;
                if (this.props.originalAspectRatio) {
                    //Keep text aspect ratio normal
                    const textAspectRatio = textSize.height / textSize.width;
                    if (textAspectRatio > this.props.originalAspectRatio) {
                        //need to add borders to left and right
                        textSize.width = textSize.height / this.props.originalAspectRatio
                    } else if (textAspectRatio < this.props.originalAspectRatio) {
                        //need to add borders to top and bottom
                        textSize.height = textSize.width * this.props.originalAspectRatio;
                    }
                }
                const extendedSize = {
                    width: Math.max(this.props.backgroundAsset.texture.width, textSize.width),
                    height: this.props.backgroundAsset.texture.height + textSize.height
                }
                copySource.width = extendedSize.width;
                copySource.height = extendedSize.height;
                ctx.drawImage(this.props.backgroundAsset.texture, 0, 0);

                const borderSizeInPixel = {
                    width: this.props.backgroundAsset.texture.width * this.props.backgroundAsset.border_width,
                    height: this.props.backgroundAsset.texture.height * this.props.backgroundAsset.border_height
                }

                const contentSize = {
                    width: this.props.backgroundAsset.texture.width - borderSizeInPixel.width * 2,
                    height: this.props.backgroundAsset.texture.height - borderSizeInPixel.height * 2,
                }

                ctx.drawImage(
                    this.props.backgroundAsset.texture,
                    borderSizeInPixel.width,
                    borderSizeInPixel.height,
                    contentSize.width, contentSize.height,
                    0, this.props.backgroundAsset.texture.height,
                    extendedSize.width, textSize.height)
                ctx.font = font;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const verticalTextMargin = textSize.height - originalTextHeight;
                ctx.fillText(
                    this.props.text,
                    extendedSize.width * 0.5,
                    this.props.backgroundAsset.texture.height + measuredSize.actualBoundingBoxAscent + verticalTextMargin * 0.5);
                /*if (label === 'MSAA' || label === 'Close') {
                    // eslint-disable-next-line promise/catch-or-return
                    copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })
                }*/
                this.textUV[0] = [0, this.props.backgroundAsset.texture.height];
                this.textUV[1] = [extendedSize.width, this.props.backgroundAsset.texture.height];
                this.textUV[2] = [extendedSize.width, extendedSize.height];
                this.textUV[3] = [0, extendedSize.height];
            }
        }
        if (this.texture) {
            if (copySource.width > this.texture.size.width) {
                this.texture.destroy()
                this.texture = undefined;
                this.drawable.setVertexBuffer(0, this.updateBoundingBoxAndVertices());
            }

        }
        if (!this.texture) {
            this.texture = new RenderTarget(
                {
                    gpu: this.props.renderPass.gpu,
                    format: "bgra8unorm",
                    usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST"],
                    label: 'button_' + this.props.label + '_UIRectangle_text',
                    size: { width: copySource.width, height: copySource.height }
                }
            );
        }

        this.texture.copyFromExternalImage(
            { source: copySource },
            {
                origin: {
                    x: 0,
                    y: 0
                }
            },
            { width: copySource.width, height: copySource.height });
        this.textureView = new TextureView(this.texture);

        return this.textureView;
    }
    /*
                //bottom left
            -content_sizeX, -content_sizeY, ...textUV[3],
            //bottom right
            content_sizeX, -content_sizeY, ...textUV[2],
            //top left
            -content_sizeX, content_sizeY, ...textUV[0],

            //top left
            -content_sizeX, content_sizeY, ...textUV[0],
            //bottom right
            content_sizeX, -content_sizeY, ...textUV[2],
            //top right
            content_sizeX, content_sizeY, ...textUV[1]

            */
    textUV: [
        topLeft: [number, number],
        topRight: [number, number],
        bottomRight: [number, number],
        bottomLeft: [number, number]] = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
        ]
    #updatePosition(buffer: ArrayBuffer) {
        const b = new Float32Array(buffer)
        if (this.props.translate.x.value[1] === NumericUnit["%"]) {
            var XPosition = this.props.translate.x.value[0]
        } else { //pixels
            var XPosition = (this.props.translate.x.value[0] / this.props.renderPass.size.width) * 2;
        }
        if (this.props.translate.x.anchor === Anchor.RIGHT) {
            XPosition = -XPosition + 1
        } else if (this.props.translate.x.anchor === Anchor.LEFT) {
            XPosition = XPosition - 1
        }
        b[0] = XPosition
        if (this.props.translate.y.value[1] === NumericUnit["%"]) {
            var YPosition = this.props.translate.y.value[0];
        } else { //pixels
            var YPosition = (this.props.translate.y.value[0] / this.props.renderPass.size.height) * 2
        }
        if (this.props.translate.y.anchor === Anchor.TOP) {
            YPosition = -YPosition + 1;
        } else if (this.props.translate.y.anchor === Anchor.BOTTOM) {
            YPosition = YPosition - 1
        }
        b[1] = YPosition

    }
    updateBoundingBoxAndVertices() {
        const { scale, renderPass, originalAspectRatio, translate } = this.props
        if (this.props.translate.x.value[1] === NumericUnit.px || this.props.translate.y.value[1] === NumericUnit.px) {
            const buff = new ArrayBuffer(8);
            this.#updatePosition(buff);
            this.uniformBuffer.write(0, buff)
        }

        let widthPixels: number;
        if (scale.unit === NumericUnit["%"]) {
            widthPixels = renderPass.size.width * scale.min_width
        } else {
            widthPixels = scale.min_width
        }
        const halfWidth = widthPixels * 0.5 * 1 / devicePixelRatio
        let halfHeight: number;
        if (originalAspectRatio) {
            const heightPixels = widthPixels * originalAspectRatio;
            if (scale.unit === NumericUnit["%"]) {
                scale.y = heightPixels / renderPass.size.height;
            } else {
                scale.y = heightPixels;
            }
            halfHeight = halfWidth * originalAspectRatio;
        } else {
            if (scale.unit === NumericUnit["%"]) {
                halfHeight = renderPass.size.height * scale.y * 0.5 * 1 / devicePixelRatio
            } else {
                halfHeight = scale.y * 0.5 * 1 / devicePixelRatio

            }
        }
        if (translate.x.value[1] === NumericUnit["%"]) {
            var offsetXPixels = (0.5 * renderPass.size.width * (translate.x.value[0] + 1)) / devicePixelRatio
        } else {
            var offsetXPixels = translate.x.value[0] / devicePixelRatio;
        }

        if (translate.x.anchor === Anchor.RIGHT) {
            var offsetXPixels = renderPass.size.width / devicePixelRatio - offsetXPixels;
        }
        if (translate.y.value[1] === NumericUnit["%"]) {
            var offsetYPixels = (0.5 * renderPass.size.height * (1 - translate.y.value[0])) / devicePixelRatio
        } else {
            var offsetYPixels = translate.y.value[0] / devicePixelRatio;
        }
        if (translate.y.anchor === Anchor.BOTTOM) {
            var offsetYPixels = renderPass.size.height / devicePixelRatio - offsetYPixels;
        }
        this.#boundingBox.top = offsetYPixels - halfHeight;
        this.#boundingBox.bottom = offsetYPixels + halfHeight;
        this.#boundingBox.left = offsetXPixels - halfWidth;
        this.#boundingBox.right = offsetXPixels + halfWidth;

        const { borderSize, label, backgroundAsset, text } = this.props
        let widthBorderPixels: number
        let heightBorderPixels: number
        let widthBorderRelative: number
        let heightBorderRelative: number
        if (borderSize.width[1] === NumericUnit["%"]) {
            widthBorderPixels = renderPass.size.width * borderSize.width[0];
            widthBorderRelative = borderSize.width[0]
        } else {
            widthBorderPixels = borderSize.width[0]
            widthBorderRelative = widthBorderPixels / renderPass.size.width
        }
        if (borderSize.height !== 'auto') {
            if (borderSize.height[1] === NumericUnit["%"]) {
                heightBorderPixels = renderPass.size.height * borderSize.height[0];
                heightBorderRelative = borderSize.height[0]
            } else {
                heightBorderPixels = borderSize.height[0]
                heightBorderRelative = heightBorderPixels / renderPass.size.height
            }
        } else {
            heightBorderRelative = widthBorderPixels / renderPass.size.height;
        }
        let outer_sizeX: number;
        let outer_sizeY: number;
        if (scale.unit === NumericUnit["%"]) {
            outer_sizeX = scale.min_width
            outer_sizeY = scale.y
        } else {
            outer_sizeX = scale.min_width / renderPass.size.width
            outer_sizeY = scale.y / renderPass.size.height
        }

        const content_sizeX = outer_sizeX - widthBorderRelative;
        const content_sizeY = outer_sizeY - heightBorderRelative
        if (content_sizeX <= 0 || content_sizeY <= 0) {
            console.warn('UI', label, 'element content size is 0 or below')
        }
        const positionsCount = (borderSize.width[0] > 0 || borderSize.height[0] > 0) ? 54 : 6
        const vertices = new Float32Array(positionsCount * 4);
        let container_uvs: {
            top: number;
            bottom: number;
            right: number;
            left: number;
        } | undefined = undefined
        ////////////////////
        /*if (!backgroundAsset) {
            throw new Error('Background needed');
        }*/
        if (backgroundAsset) {
            if (backgroundAsset.texture instanceof ImageBitmap) {
                var textureSize: Texture2dSize = { width: backgroundAsset.texture.width, height: backgroundAsset.texture.height };
            } else {
                var textureSize = backgroundAsset.texture.texture.size;
            }
            container_uvs = {
                top: (1 - backgroundAsset.border_height) * textureSize.height,
                bottom: backgroundAsset.border_height * textureSize.height,
                right: backgroundAsset.border_width * textureSize.width,
                left: (1 - backgroundAsset.border_width) * textureSize.width
            }
        }

        /*var container_topUV = (1 - backgroundAsset.border_height) * textureSize.height;
        var container_bottomUV = backgroundAsset.border_height * textureSize.height;
        var container_rightUV = backgroundAsset.border_width * textureSize.width;
        var conteiner_leftUV = (1 - backgroundAsset.border_width) * textureSize.width;*/
        ///////////////////
        console.log('textUV', text, this.textUV)
        if (text) {
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
        } else {
            if (!container_uvs) {
                throw new Error('Background needed')
            }
            vertices.set(
                [
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,

                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom

                ]);
        }
        if (borderSize.width[0] > 0 || (borderSize.height !== "auto" && borderSize.height[0] > 0)) {
            if (!container_uvs) {
                throw new Error('Background needed')
            }
            //Left content_size
            vertices.set(
                [
                    -outer_sizeX, -content_sizeY, 0, container_uvs.top,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    -outer_sizeX, content_sizeY, 0, container_uvs.bottom,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,
                    -outer_sizeX, content_sizeY, 0, container_uvs.bottom,


                    //right content_size

                    outer_sizeX, -content_sizeY, textureSize!.width, container_uvs.top,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    outer_sizeX, content_sizeY, textureSize!.width, container_uvs.bottom,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom,
                    outer_sizeX, content_sizeY, textureSize!.width, container_uvs.bottom,
                    //bottom content_size

                    -content_sizeX, -outer_sizeY, container_uvs.right, textureSize!.height,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    content_sizeX, -outer_sizeY, container_uvs.left, textureSize!.height,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    content_sizeX, -outer_sizeY, container_uvs.left, textureSize!.height,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,

                    //top content_size

                    -content_sizeX, outer_sizeY, container_uvs.right, 0,
                    content_sizeX, outer_sizeY, container_uvs.left, 0,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom,
                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom,
                    -content_sizeX, outer_sizeY, container_uvs.right, 0,

                    //top left corner

                    -outer_sizeX, outer_sizeY, 0, 0,
                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,
                    -content_sizeX, outer_sizeY, container_uvs.right, 0,
                    -outer_sizeX, outer_sizeY, 0, 0,
                    -content_sizeX, content_sizeY, container_uvs.right, container_uvs.bottom,
                    -outer_sizeX, content_sizeY, 0, container_uvs.bottom,

                    //bottom left corner

                    -outer_sizeX, -outer_sizeY, 0, textureSize!.height,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    -content_sizeX, -outer_sizeY, container_uvs.right, textureSize!.height,
                    -outer_sizeX, -outer_sizeY, 0, textureSize!.height,
                    -content_sizeX, -content_sizeY, container_uvs.right, container_uvs.top,
                    -outer_sizeX, -content_sizeY, 0, container_uvs.top,

                    //top right corner

                    outer_sizeX, outer_sizeY, textureSize!.width, 0,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom,
                    content_sizeX, outer_sizeY, container_uvs.left, 0,
                    outer_sizeX, outer_sizeY, textureSize!.width, 0,
                    content_sizeX, content_sizeY, container_uvs.left, container_uvs.bottom,
                    outer_sizeX, content_sizeY, textureSize!.width, container_uvs.bottom,

                    //bottom right corner

                    outer_sizeX, -outer_sizeY, textureSize!.width, textureSize!.height,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    content_sizeX, -outer_sizeY, container_uvs.left, textureSize!.height,
                    outer_sizeX, -outer_sizeY, textureSize!.width, textureSize!.height,
                    content_sizeX, -content_sizeY, container_uvs.left, container_uvs.top,
                    outer_sizeX, -content_sizeY, textureSize!.width, container_uvs.top,
                ], 24)
        }
        return vertices;
    }
    constructor(public props: UIRectangleProps) {
        const {
            canvaspipeline,
            renderPass,
            label,
            borderSize,
            backgroundAsset,
            events,
        } = props;
        this.positions_count = (borderSize.width[0] > 0 || borderSize.height[0] > 0) ? 54 : 6;
        this.label = label + '_UIRectangle';

        // this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, new Set([renderPass]))
        if (backgroundAsset?.texture instanceof TextureView) {
            this.textureView = backgroundAsset.texture;
        } else {
            this.textureView = this.createTexture();
        }

        this.uniformBuffer = Buffer.create(renderPass.gpu, 8 /* size of vec2<f32> */, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'UI_transform', (buff) => {
            this.#updatePosition(buff.getMappedRange());
        });
        const onClick = events?.onClick;
        if (onClick) {
            const checkClickArea = (e: PointerEvent) => {
                return (
                    (e.offsetX > this.#boundingBox.left && e.offsetX < this.#boundingBox.right)
                    &&
                    (e.offsetY > this.#boundingBox.top && e.offsetY < this.#boundingBox.bottom)
                )
            }
            let pointerDown = false;
            engine.addInputListener('pointerup', this, (e) => {
                if (pointerDown && checkClickArea(e)) {
                    onClick(e);
                    return true;
                }
                return false;
            }, true)
            engine.addInputListener('pointerdown', this, (e) => {
                if (checkClickArea(e)) {
                    pointerDown = true;
                    return true;
                }
                return false;
            }, true)
        }

        renderPass.onResize.set(this, () => {
            const newVertices = this.updateBoundingBoxAndVertices();
            this.drawable.setVertexBuffer(0, newVertices);
        });

        const vertices = this.updateBoundingBoxAndVertices();
        this.drawable = new DrawableSimple({
            renderPipeline: canvaspipeline,
            renderPasses: new Set([renderPass]),
            vertexBuffers: [vertices]
        }, {
            node: this,
            instanceCount: 1,
            firstVertex: 0,
            firstInstance: 0,
        });

        this.drawable.setStaticBindGroup('UI_bindgroup_' + label, (bindGroup) => {
            return [
                {
                    binding: 0,
                    resource: this.uniformBuffer.getUniformBinding(bindGroup)
                },
                {
                    binding: 1,
                    resource: this.textureView.getTextureBinding(bindGroup)
                }
            ]
        })
    }
    destroy() {
        this.props.renderPass.onResize.delete(this);
        engine.clearInputListeners(this);
        this.drawable.destroy();
    }
}
