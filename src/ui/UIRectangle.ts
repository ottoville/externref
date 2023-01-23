import type { RenderPass } from "../GPU/RenderPasses/RenderPass.js";
import { Buffer, GPUBufferUsage } from "../GPU/Buffer/Buffer.js";
import { TextureView } from "../GPU/TextureView.js";
import type { Engine } from "../engine.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { Texture, TextureUsageEnums, TextureUsageValue } from "../GPU/Texture.js";
import { Texture2D, type Texture2dSize } from "../GPU/Texture2D.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
import type { RenderPipeline } from "../GPU/RenderPipeline2.js";
import type { UIVertShader } from "../GPU/Shaders/UI.vert.js";
declare const engine: Engine;
export type ButtonSize = { min_width: number, y: number }

function createVertexBuffer(
    scale: ButtonSize,
    renderPassSize: {
        readonly width: number;
        readonly height: number;
    },
    borderSize: {
        width: number,
        height: number | 'auto',
        texture_width: number,
        texture_height: number
    },
    textureSize: { width: number, height: number },
    label: string,
    textUV: readonly [[number, number], [number, number], [number, number], [number, number]],
    text?: string,
) {
    if (borderSize.width > 0 || (typeof borderSize.height === "number" && borderSize.height > 0)) {
        const widthBorderPixels = renderPassSize.width * borderSize.width;
        borderSize.height = widthBorderPixels / renderPassSize.height;
    }
    const outer_sizeX = scale.min_width
    const outer_sizeY = scale.y

    const content_sizeX = outer_sizeX - borderSize.width
    const content_sizeY = outer_sizeY - ((typeof borderSize.height === 'number') ? borderSize.height : 0)
    if (content_sizeX <= 0 || content_sizeY <= 0) {
        console.warn('UI', label, 'element content size is 0 or below')
    }
    const positionsCount = (borderSize.width > 0 || borderSize.height > 0) ? 54 : 6
    const vertices = new Float32Array(positionsCount * 4);
    const container_topUV = (1 - borderSize.texture_height) * textureSize.height;
    const container_bottomUV = borderSize.texture_height * textureSize.height;
    const container_rightUV = borderSize.texture_width * textureSize.width;
    const conteiner_leftUV = (1 - borderSize.texture_width) * textureSize.width;
    if (text) {
        vertices.set([
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
        ]);
    } else {
        vertices.set(
            [
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,

                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV

            ]);
    }

    if (borderSize.width > 0 || borderSize.height > 0) {
        //Left content_size
        vertices.set(
            [
                -outer_sizeX, -content_sizeY, 0, container_topUV,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                -outer_sizeX, content_sizeY, 0, container_bottomUV,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,
                -outer_sizeX, content_sizeY, 0, container_bottomUV,


                //right content_size

                outer_sizeX, -content_sizeY, textureSize.width, container_topUV,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                outer_sizeX, content_sizeY, textureSize.width, container_bottomUV,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV,
                outer_sizeX, content_sizeY, textureSize.width, container_bottomUV,
                //bottom content_size

                -content_sizeX, -outer_sizeY, container_rightUV, textureSize.height,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                content_sizeX, -outer_sizeY, conteiner_leftUV, textureSize.height,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                content_sizeX, -outer_sizeY, conteiner_leftUV, textureSize.height,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,

                //top content_size

                -content_sizeX, outer_sizeY, container_rightUV, 0,
                content_sizeX, outer_sizeY, conteiner_leftUV, 0,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV,
                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV,
                -content_sizeX, outer_sizeY, container_rightUV, 0,

                //top left corner

                -outer_sizeX, outer_sizeY, 0, 0,
                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,
                -content_sizeX, outer_sizeY, container_rightUV, 0,
                -outer_sizeX, outer_sizeY, 0, 0,
                -content_sizeX, content_sizeY, container_rightUV, container_bottomUV,
                -outer_sizeX, content_sizeY, 0, container_bottomUV,

                //bottom left corner

                -outer_sizeX, -outer_sizeY, 0, textureSize.height,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                -content_sizeX, -outer_sizeY, container_rightUV, textureSize.height,
                -outer_sizeX, -outer_sizeY, 0, textureSize.height,
                -content_sizeX, -content_sizeY, container_rightUV, container_topUV,
                -outer_sizeX, -content_sizeY, 0, container_topUV,

                //top right corner

                outer_sizeX, outer_sizeY, textureSize.width, 0,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV,
                content_sizeX, outer_sizeY, conteiner_leftUV, 0,
                outer_sizeX, outer_sizeY, textureSize.width, 0,
                content_sizeX, content_sizeY, conteiner_leftUV, container_bottomUV,
                outer_sizeX, content_sizeY, textureSize.width, container_bottomUV,

                //bottom right corner

                outer_sizeX, -outer_sizeY, textureSize.width, textureSize.height,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                content_sizeX, -outer_sizeY, conteiner_leftUV, textureSize.height,
                outer_sizeX, -outer_sizeY, textureSize.width, textureSize.height,
                content_sizeX, -content_sizeY, conteiner_leftUV, container_topUV,
                outer_sizeX, -content_sizeY, textureSize.width, container_topUV,
            ], 24)
    }
    return vertices;
}
export type UIRectangleProps = {
    canvaspipeline: RenderPipeline<UIVertShader>,
    renderPass: RenderPass,
    label: string,
    /**
        width: Relative width of borders to viewport, value between 0 and 1
        height: Relative height of borders to viewport, value between 0 and 1
                If "auto", it is calculated to be same than width
        texture_width: Relative width of border in texture UV mapping, between 0 and 1
        texture_height: Relative height of border in texture UV mapping, between 0 and 1
    */
    borderSize: {
        width: number,
        height: number | 'auto',
        texture_width: number,
        texture_height: number
    },
    backgroundTexture: ImageBitmap | TextureView<Texture2D>,
    text?: string,
    /**
        Size of the button relative to viewport size, value between 0 and 1.
        Border size is taken account to scale.
    */
    scale: ButtonSize,
    translate: { x: number, y: number },
    originalAspectRatio?: number,
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
    #renderPass: RenderPass;
    #boundingBox = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }
    constructor({
        canvaspipeline,
        renderPass,
        label,
        borderSize,
        backgroundTexture,
        scale,
        translate,
        originalAspectRatio,
        events,
        text }: UIRectangleProps) {

        this.positions_count = (borderSize.width > 0 || borderSize.height > 0) ? 54 : 6;
        this.label = label + '_UIRectangle';
        //super({ positionsCount: (borderSize.width > 0 || borderSize.height > 0) ? 54 : 6, label });
        this.#renderPass = renderPass;
        let textureView: TextureView<Texture<GPUTextureFormat, TextureUsageValue>>
        let textUV: readonly [[number, number], [number, number], [number, number], [number, number]] = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
        ]
        // this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, new Set([renderPass]))
        if (backgroundTexture instanceof ImageBitmap) {
            var backgroundSize: Texture2dSize = { width: backgroundTexture.width, height: backgroundTexture.height };
            let copySource: ImageBitmap | OffscreenCanvas = backgroundTexture;

            // Create texture for text
            if (text) {
                copySource = new OffscreenCanvas(backgroundSize.width, backgroundSize.height);
                const ctx = copySource.getContext("2d")
                if (!ctx) {
                    throw new Error('Cant get 2d context for texture text');
                }
                const font = '48px serif';
                ctx.textBaseline = "top";
                ctx.font = font;
                const measuredSize = ctx.measureText(text)
                const textSize = { width: measuredSize.width, height: measuredSize.actualBoundingBoxAscent + measuredSize.actualBoundingBoxDescent }

                const originalTextHeight = textSize.height;
                if (originalAspectRatio) {
                    //Keep text aspect ratio normal
                    const textAspectRatio = textSize.height / textSize.width;
                    if (textAspectRatio > originalAspectRatio) {
                        //need to add borders to left and right
                        textSize.width = textSize.height / originalAspectRatio
                    } else if (textAspectRatio < originalAspectRatio) {
                        //need to add borders to top and bottom
                        textSize.height = textSize.width * originalAspectRatio
                    }
                }
                const extendedSize = {
                    width: Math.max(backgroundSize.width, textSize.width),
                    height: backgroundSize.height + textSize.height
                }
                copySource.width = extendedSize.width;
                copySource.height = extendedSize.height;
                ctx.drawImage(backgroundTexture, 0, 0);

                const borderSizeInPixel = {
                    width: backgroundSize.width * borderSize.texture_width,
                    height: backgroundSize.height * borderSize.texture_height
                }

                const contentSize = {
                    width: backgroundSize.width - borderSizeInPixel.width * 2,
                    height: backgroundSize.height - borderSizeInPixel.height * 2,
                }

                ctx.drawImage(
                    backgroundTexture,
                    borderSizeInPixel.width,
                    borderSizeInPixel.height,
                    contentSize.width, contentSize.height,
                    0, backgroundSize.height,
                    extendedSize.width, textSize.height)
                ctx.font = font;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const verticalTextMargin = textSize.height - originalTextHeight;
                ctx.fillText(
                    text,
                    extendedSize.width * 0.5,
                    backgroundSize.height + measuredSize.actualBoundingBoxAscent + verticalTextMargin * 0.5);
                if (label === 'createGrassButton') {
                    // eslint-disable-next-line promise/catch-or-return
                    copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })
                }

                textUV = [
                    [0, backgroundSize.height],
                    [extendedSize.width, backgroundSize.height],
                    [extendedSize.width, extendedSize.height],
                    [0, extendedSize.height]
                ]
            }
            const texture = new RenderTarget(
                {
                    gpu: renderPass.gpu,
                    format: "bgra8unorm",
                    usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST"],
                    label: 'button_' + label + '_text',
                    size: { width: copySource.width, height: copySource.height }
                }
            );

            texture.copyFromExternalImage(
                { source: copySource },
                {
                    origin: {
                        x: 0,
                        y: 0
                    }
                },
                { width: copySource.width, height: copySource.height })
            textureView = new TextureView(texture);
        } else {
            var backgroundSize = backgroundTexture.texture.size;
            textureView = backgroundTexture
        }


        const uniformBuffer = Buffer.create(renderPass.gpu, 8 /* size of vec2<f32> */, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'UI_transform', (buff) => {
            const b = new Float32Array(buff.getMappedRange())
            b.set([translate.x, translate.y])
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
        const updateBoundingBoxAndVertices = () => {
            const widthPixels = renderPass.size.width * scale.min_width;
            const offsetXPixels = renderPass.size.width * ((translate.x + 1) * 0.5) * 1 / devicePixelRatio;
            const offsetYPixels = renderPass.size.height * ((-translate.y + 1) * 0.5) * 1 / devicePixelRatio;
            const halfWidth = widthPixels * 0.5 * 1 / devicePixelRatio
            let halfHeight: number;
            if (originalAspectRatio) {
                const heightPixels = widthPixels * originalAspectRatio;
                scale.y = heightPixels / renderPass.size.height;
                halfHeight = halfWidth * originalAspectRatio;
            } else {
                halfHeight = renderPass.size.height * scale.y * 0.5 * 1 / devicePixelRatio
            }
            this.#boundingBox.top = offsetYPixels - halfHeight;
            this.#boundingBox.bottom = offsetYPixels + halfHeight;
            this.#boundingBox.left = offsetXPixels - halfWidth;
            this.#boundingBox.right = offsetXPixels + halfWidth;

            return createVertexBuffer(scale, renderPass.size, borderSize, backgroundSize, label, textUV, text);
        }
        renderPass.onResize.set(this, () => {
            const newVertices = updateBoundingBoxAndVertices();
            this.drawable.setVertexBuffer(0, newVertices);
        });

        const vertices = updateBoundingBoxAndVertices();

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
                    resource: uniformBuffer.getUniformBinding(bindGroup)
                },
                {
                    binding: 1,
                    resource: textureView.getTextureBinding(bindGroup)
                }
            ]
        })
    }
    destroy() {
        this.#renderPass.onResize.delete(this);
        engine.clearInputListeners(this);
        this.drawable.destroy();
    }
}
