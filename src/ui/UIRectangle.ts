import type { RenderPass } from "../GPU/RenderPasses/RenderPass.js";
import { Buffer, type CopyDstBuffer, GPUBufferUsage, BindUniformBuffer } from "../GPU/Buffer/Buffer.js";
import { TextureView } from "../GPU/TextureView.js";
import type { Engine, ListenerObj } from "../engine.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { TextureUsageEnums } from "../GPU/Texture.js";
import { Texture2D } from "../GPU/Texture2D.js";
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
export abstract class UIRectangle {
    label: string;
    positions_count: number;

    drawable?: DrawableSimple<RenderPipeline<UIVertShader>>;
    boundingBox = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }
    texture?: RenderTarget<"bgra8unorm", (typeof TextureUsageEnums)["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST"]> | undefined;
    uniformBuffer: CopyDstBuffer & BindUniformBuffer;
    textureView: TextureView<Texture2D>;
    createTextureView(
        copySource: ImageBitmap | OffscreenCanvas,
    ) {
        if (this.drawable && this.texture) {
            if (copySource.width > this.texture.size.width ||
                copySource.height > this.texture.size.height) {
                this.texture.destroy()
                this.texture = undefined;
                this.drawable.setVertexBuffer(0, this.#updateBoundingBoxAndVerticesSuper());
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
    abstract createTexture(): TextureView<Texture2D>
    protected updatePosition(buffer: ArrayBuffer) {
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
    #updateBoundingBoxAndVerticesSuper() {
        const { scale, renderPass, originalAspectRatio, translate } = this.props
        if (this.props.translate.x.value[1] === NumericUnit.px || this.props.translate.y.value[1] === NumericUnit.px) {
            const buff = new ArrayBuffer(8);
            this.updatePosition(buff);
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
        this.boundingBox.top = offsetYPixels - halfHeight;
        this.boundingBox.bottom = offsetYPixels + halfHeight;
        this.boundingBox.left = offsetXPixels - halfWidth;
        this.boundingBox.right = offsetXPixels + halfWidth;

        const { borderSize, label } = this.props
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
        return this.updateBoundingBoxAndVertices({ vertices, content_sizeX, content_sizeY, outer_sizeX, outer_sizeY })

    }
    abstract updateBoundingBoxAndVertices(
        params: {
            vertices: Float32Array;
            content_sizeX: number;
            content_sizeY: number;
            outer_sizeX: number;
            outer_sizeY: number;
        }
    ): Float32Array

    constructor(
        public props: UIRectangleProps,
        texture: TextureView<Texture2D> | ImageBitmap | OffscreenCanvas) {
        const {
            canvaspipeline,
            renderPass,
            label,
            borderSize,
            events,
        } = props;
        this.positions_count = (borderSize.width[0] > 0 || borderSize.height[0] > 0) ? 54 : 6;
        this.label = label + '_UIRectangle';

        this.uniformBuffer = Buffer.create(renderPass.gpu, 8 /* size of vec2<f32> */, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'UI_transform', (buff) => {
            this.updatePosition(buff.getMappedRange());
        },

        );
        const onClick = events?.onClick;
        if (onClick) {
            const checkClickArea = (e: PointerEvent) => {
                return (
                    (e.offsetX > this.boundingBox.left && e.offsetX < this.boundingBox.right)
                    &&
                    (e.offsetY > this.boundingBox.top && e.offsetY < this.boundingBox.bottom)
                )
            }
            let pointerDown = false;
            engine.addInputListener({
                object: this,
                type: 'pointerup',
                options: { ui: true },
                cb: (e) => {
                    if (pointerDown && checkClickArea(e)) {
                        onClick(e);
                        return true;
                    }
                    return false;
                }
            } as ListenerObj<'pointerup'>)
            engine.addInputListener({
                object: this,
                type: 'pointerdown',
                options: { ui: true },
                cb: (e) => {
                    if (checkClickArea(e)) {
                        pointerDown = true;
                        return true;
                    }
                    return false;
                }
            } as ListenerObj<'pointerdown'>)
        }

        if (!(texture instanceof TextureView)) {
            this.textureView = this.createTextureView(texture)
        } else {
            this.textureView = texture;
        }
        queueMicrotask(() => {
            const vertices = this.#updateBoundingBoxAndVerticesSuper();
            const drawable = new DrawableSimple({
                renderPipeline: canvaspipeline,
                renderPasses: new Set([renderPass]),
                vertexBuffers: [vertices]
            }, {
                node: this,
                instanceCount: 1,
                firstVertex: 0,
                firstInstance: 0,
            });
            this.drawable = drawable
            renderPass.onResize.set(this, () => {
                const newVertices = this.#updateBoundingBoxAndVerticesSuper();
                drawable.setVertexBuffer(0, newVertices);
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
        })


    }
    destroy() {
        this.props.renderPass.onResize.delete(this);
        engine.clearInputListeners(this);
        this.drawable?.destroy();
    }
}
