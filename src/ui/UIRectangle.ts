import { UINode } from "../MainNode.js";
import type { RenderPipeline, VertexShader } from "../GPU/RenderPipeline.js";
import type { RenderPass } from "../GPU/RenderPasses/RenderPass.js";
import { Buffer, GPUBufferUsage } from "../GPU/Buffer.js";
import { TextureView } from "../GPU/TextureView.js";
import type { Engine } from "../engine.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { Texture, TextureUsage } from "../GPU/Texture.js";
import { Texture2D, type Texture2dSize } from "../GPU/Texture2D.js";
import { RenderTarget } from "GPU/RenderTargets/RenderTarget.js";
declare const engine: Engine;

type ButtonSize = { min_width: number, y: number }

function createVertexBuffer(
    scale: ButtonSize,
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
    const outer_sizeX = scale.min_width
    const outer_sizeY = scale.y

    const content_sizeX = outer_sizeX - borderSize.width
    const content_sizeY = outer_sizeY - ((typeof borderSize.height === 'number') ? borderSize.height : 0)
    if (content_sizeX <= 0 || content_sizeY <= 0) {
        console.warn('UI', label, 'element content size is 0 or below')
    }
    const vertices: [number, number, number, number][] = [];
    if (text) {
        vertices.push(
            //bottom left
            [-content_sizeX, -content_sizeY, ...textUV[3]],
            //bottom right
            [content_sizeX, -content_sizeY, ...textUV[2]],
            //top left
            [-content_sizeX, content_sizeY, ...textUV[0]],

            //top left
            [-content_sizeX, content_sizeY, ...textUV[0]],
            //bottom right
            [content_sizeX, -content_sizeY, ...textUV[2]],
            //top right
            [content_sizeX, content_sizeY, ...textUV[1]]);
    } else {
        vertices.push(
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],

            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height]);
    }

    if (borderSize.width > 0 || borderSize.height > 0) {
        //Left content_size
        vertices.push(
            [-outer_sizeX, -content_sizeY, 0, 1 - borderSize.texture_height],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-outer_sizeX, content_sizeY, 0, borderSize.texture_height],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [-outer_sizeX, content_sizeY, 0, borderSize.texture_height]);

        //right content_size
        vertices.push(
            [outer_sizeX, -content_sizeY, 1, 1 - borderSize.texture_height],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [outer_sizeX, content_sizeY, 1, borderSize.texture_height],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height],
            [outer_sizeX, content_sizeY, 1, borderSize.texture_height]);
        //bottom content_size
        vertices.push(
            [-content_sizeX, -outer_sizeY, borderSize.texture_width, 1],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, -outer_sizeY, 1 - borderSize.texture_width, 1],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, -outer_sizeY, 1 - borderSize.texture_width, 1],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
        );
        //top content_size
        vertices.push(
            [-content_sizeX, outer_sizeY, borderSize.texture_width, 0],
            [content_sizeX, outer_sizeY, 1 - borderSize.texture_width, 0],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height],
            [-content_sizeX, outer_sizeY, borderSize.texture_width, 0]
        )
        //top left corner
        vertices.push(
            [-outer_sizeX, outer_sizeY, 0, 0],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [-content_sizeX, outer_sizeY, borderSize.texture_width, 0],
            [-outer_sizeX, outer_sizeY, 0, 0],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [-outer_sizeX, content_sizeY, 0, borderSize.texture_height],
        )
        //bottom left corner
        vertices.push(
            [-outer_sizeX, -outer_sizeY, 0, 1],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-content_sizeX, -outer_sizeY, borderSize.texture_width, 1],
            [-outer_sizeX, -outer_sizeY, 0, 1],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-outer_sizeX, -content_sizeY, 0, 1 - borderSize.texture_height],
        )
        //top right corner
        vertices.push(
            [outer_sizeX, outer_sizeY, 1, 0],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height],
            [content_sizeX, outer_sizeY, 1 - borderSize.texture_width, 0],
            [outer_sizeX, outer_sizeY, 1, 0],
            [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height],
            [outer_sizeX, content_sizeY, 1, borderSize.texture_height],
        )
        //bottom right corner
        vertices.push(
            [outer_sizeX, -outer_sizeY, 1, 1],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [content_sizeX, -outer_sizeY, 1 - borderSize.texture_width, 1],
            [outer_sizeX, -outer_sizeY, 1, 1],
            [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
            [outer_sizeX, -content_sizeY, 1, 1 - borderSize.texture_height],
        )
    }
    vertices.forEach((vertice, i) => {
        if (text && i < 7) {
            return;
        }
        vertice[2] *= textureSize.width
        vertice[3] *= textureSize.height
    })
    return vertices;
}
/*
    Draws rectangle.
*/
export class UIRectangle extends UINode {
    drawable: DrawableSimple<RenderPipeline<VertexShader<[{
        arrayStride: number;
        stepMode: "vertex";
        attributes: {
            shaderLocation: number;
            offset: number;
            format: "float32x2";
        }[];
    }]>>>;
    #renderPass: RenderPass;
    #boundingBox = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }
    constructor({
        canvaspipeline, renderPass, label,
        borderSize,
        backgroundTexture,
        scale, translate, originalAspectRatio,
        events,
        text }:
        {
            canvaspipeline: RenderPipeline<VertexShader<[{
                arrayStride: number;
                stepMode: "vertex";
                attributes: {
                    shaderLocation: number;
                    offset: number;
                    format: "float32x2";
                }[];
            }]>>,
            renderPass: RenderPass,
            label: string,
            /*
                BorderSize
                    width: Relative width of borders to viewport, value between 0 and 1
                    height: Relative height of borders to viewport, value between 0 and 1
                            If "auto", it is calculated to be same than width
                    texture_width: Relative width of border in texture UV mapping, between 0 and 1
                    texture_height: Relative height of border in texture UV mapping, between 0 and 1
            */
            borderSize: {
                width: number, height: number | 'auto',
                texture_width: number, texture_height: number
            },
            backgroundTexture: ImageBitmap | TextureView<Texture2D>,
            text?: string,
            /*
                Scale:
                    Size of the button relative to viewport size, value between 0 and 1.
                    Border size is taken account to scale.
            */
            scale: ButtonSize,
            translate: { x: number, y: number },
            originalAspectRatio?: number,
            events?: {
                onClick?: (e: PointerEvent) => void,
            }
        }) {
        super({ positionsCount: (borderSize.width > 0 || borderSize.height > 0) ? 54 : 6, label });
        this.#renderPass = renderPass;
        let textureView: TextureView<Texture>
        let textUV: readonly [[number, number], [number, number], [number, number], [number, number]] = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
        ]
        // this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, new Set([renderPass]))
        if (backgroundTexture instanceof ImageBitmap) {
            var backgroundSize:Texture2dSize = { width: backgroundTexture.width, height: backgroundTexture.height };
            let copySource: ImageBitmap | OffscreenCanvas = backgroundTexture;

            // Create texture for text
            if (text) {
                copySource = new OffscreenCanvas(backgroundSize.width, backgroundSize.height);
                const ctx = copySource.getContext("2d")
                if (!ctx) {
                    throw new Error('Cant get 2d context for texture text');
                }
                const font = '48px serif';
                ctx.textBaseline ="top";
                ctx.font = font;
                const measuredSize = ctx.measureText(text)
                const textSize = { width: measuredSize.width, height: measuredSize.actualBoundingBoxAscent + measuredSize.actualBoundingBoxDescent                }
                console.log(measuredSize)


                if(originalAspectRatio) {
                    //Keep text aspect ratio normal
                    const textAspectRatio = textSize.height / textSize.width;
                    if(textAspectRatio > originalAspectRatio) {
                        //need to add borders to left and right
                        textSize.width = textSize.height/originalAspectRatio
                    } else if(textAspectRatio < originalAspectRatio) {
                        //need to add borders to top and bottom
                        textSize.height = textSize.width*originalAspectRatio
                    }
                }
                const extendedSize = {
                    width: Math.max(backgroundSize.width, textSize.width),
                    height: backgroundSize.height + textSize.height
                }
                copySource.width = extendedSize.width;
                copySource.height = extendedSize.height;
                ctx.drawImage(backgroundTexture, 0, 0);

                
                backgroundSize.height*borderSize.texture_height

                const borderSizeInPixel = {
                    width: backgroundSize.width*borderSize.texture_width,
                    height: backgroundSize.height*borderSize.texture_height
                }

                const contentSize = {
                    width: backgroundSize.width - borderSizeInPixel.width*2,
                    height: backgroundSize.height - borderSizeInPixel.height*2,
                }

                ctx.drawImage(
                    backgroundTexture,
                    borderSizeInPixel.width,
                    borderSizeInPixel.height,
                    contentSize.width,contentSize.height,
                    0,backgroundSize.height,
                    extendedSize.width, textSize.height)
                ctx.font = font;
                ctx.textAlign = "center";
                ctx.textBaseline ="top";
                ctx.fillText(text, extendedSize.width*0.5, backgroundSize.height + measuredSize.actualBoundingBoxAscent);

                //copySource.convertToBlob().then(b => {console.log(URL.createObjectURL(b!))})


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
                    usages: TextureUsage["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST"],
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
                {width: copySource.width, height: copySource.height})

            textureView = new TextureView(texture);
            backgroundTexture.close();
        } else {
            var backgroundSize = backgroundTexture.texture.size;
            textureView = backgroundTexture
        }

        const vertices = createVertexBuffer(scale, borderSize, backgroundSize, label, textUV, text);

        this.drawable = new DrawableSimple({
            renderPipeline: canvaspipeline,
            node: this,
            renderPasses: new Set([renderPass]),
            instanceCount: 1,
            firstVertex: 0,
            firstInstance: 0,
            vertexBuffers: [new Float32Array(vertices.flat())]
        });



        const uniformBuffer = Buffer.create(renderPass.gpu, 8 /* size of vec2<f32> */, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'UI_transform', (buff) => {
            const b = new Float32Array(buff.getMappedRange())
            b.set([translate.x, translate.y])
        });
        const onClick = events?.onClick;
        if (onClick) {
            const clickListener = (e: PointerEvent) => {
                if (
                    (e.offsetX > this.#boundingBox.left && e.offsetX < this.#boundingBox.right)
                    &&
                    (e.offsetY > this.#boundingBox.top && e.offsetY < this.#boundingBox.bottom)
                ) {
                    onClick(e);
                }
            }
            engine.addInputListener('pointerdown', this, clickListener)
        }
        renderPass.onResize.set(this, () => {
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

            if (borderSize.width > 0 || (typeof borderSize.height === "number" && borderSize.height > 0)) {
                const widthBorderPixels = renderPass.size.width * borderSize.width;
                borderSize.height = widthBorderPixels / renderPass.size.height;
            }

            const newVertices = createVertexBuffer(scale, borderSize, backgroundSize, label, textUV, text);
            //TODO: enforce vertices set when pipeline have vertices buffer
            this.drawable.setVertexBuffer(0, new Float32Array(newVertices.flat()));
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
    override destroy() {
        super.destroy();
        this.#renderPass.onResize.delete(this);
        engine.clearInputListeners(this);
    }
}
