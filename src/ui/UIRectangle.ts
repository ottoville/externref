import { UINode } from "../MainNode.js";
import type { RenderPipeline, VertexShader } from "../GPU/RenderPipeline.js";
import type { RenderPass } from "../GPU/RenderPasses/RenderPass.js";
import { Buffer } from "../GPU/Buffer.js";
import { GPUBufferUsage } from "../GPU.js";
import { TextureView } from "../GPU/TextureView.js";
import type { Engine } from "../engine.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { Texture } from "../GPU/Texture.js";
declare const engine:Engine;

function createVertexBuffer(scale: { x: number, y: number },
    borderSize: {
        width: number,
        height: number | 'auto',
        texture_width: number,
        texture_height: number
    }, textureSize: [number, number, number], label:string) {


    const outer_sizeX = (1 * scale.x)
    const outer_sizeY = (1 * scale.y)

    const content_sizeX = outer_sizeX - borderSize.width
    const content_sizeY = outer_sizeY - ((typeof borderSize.height==='number')?borderSize.height:0)
    if (content_sizeX <= 0 || content_sizeY <= 0) {
        console.warn('UI', label, 'element content size is 0 or below')
    }
    const vertices = [
        [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
        [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
        [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],

        [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
        [content_sizeX, -content_sizeY, 1 - borderSize.texture_width, 1 - borderSize.texture_height],
        [content_sizeX, content_sizeY, 1 - borderSize.texture_width, borderSize.texture_height]] as [number, number, number, number][]
    if (borderSize.width > 0 || borderSize.height > 0) {
        //Left content_size
        vertices.push(
            [-outer_sizeX, -content_sizeY, 0,  1 - borderSize.texture_height],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-outer_sizeX, content_sizeY, 0, borderSize.texture_height],
            [-content_sizeX, -content_sizeY, borderSize.texture_width, 1 - borderSize.texture_height],
            [-content_sizeX, content_sizeY, borderSize.texture_width, borderSize.texture_height],
            [-outer_sizeX, content_sizeY, 0, borderSize.texture_height]);

        //right content_size
        vertices.push(
            [outer_sizeX, -content_sizeY, 1,  1 - borderSize.texture_height],
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
    vertices.forEach(vertice => {
        vertice[2] *= textureSize[0]
        vertice[3] *= textureSize[1]
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
    #boundingBox= {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    }
    constructor({
        canvaspipeline, renderPass, label,
        borderSize, textureView, scale, translate, originalAspectRatio,
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
            textureView: TextureView,
            text?: string,
            /*
                Scale:
                    Size of the button relative to viewport size, value between 0 and 1.
                    Border size is taken account to scale.
            */
            scale: { x: number, y: number },
            translate: { x: number, y: number },
            originalAspectRatio?: number,
            events?: {
                onClick?:(e:PointerEvent) => void,
            }
        }) {
        super({ positionsCount: (borderSize.width > 0 || borderSize.height > 0) ? 54 : 6, label });
        this.#renderPass = renderPass;
       // this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, new Set([renderPass]))
       const vertices = createVertexBuffer(scale, borderSize, textureView.texture.size, label);

       this.drawable = new DrawableSimple( {
            renderPipeline: canvaspipeline,
            node: this,
            renderPasses: new Set([renderPass]),
            instanceCount: 1,
            firstVertex: 0,
            firstInstance: 0,
            vertexBuffers: [new Float32Array(vertices.flat())]
        });
        //this.drawable.setVertexBuffer(0, new Float32Array(vertices.flat()));

        


        // Create texture for text
        const texture = Texture.create(renderPass.gpu, "bgra8unorm", ["RENDER_ATTACHMENT", "TEXTURE_BINDING", "COPY_DST"], 'button_'+label+'_text',[500, 100, 1])
        if(text) {
            const canvas = new OffscreenCanvas(texture.size[0], texture.size[1]);
            const ctx = canvas.getContext("2d")
            if(!ctx) {
                throw new Error('Cant get 2d context for texture text');
            }
            ctx.font = '48px serif';
            ctx.fillText('Hello world', 0, 0);
            renderPass.gpu.device.queue.copyExternalImageToTexture({source: canvas}, texture, [canvas.width, canvas.height, 1]);
        }

        const uniformBuffer = Buffer.create(renderPass.gpu, 8 /* size of vec2<f32> */, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'UI_transform', (buff) => {
            const b = new Float32Array(buff.getMappedRange())
            b.set([translate.x, translate.y])
        });
        const onClick = events?.onClick;
        if(onClick) {
            const clickListener = (e:PointerEvent) => {
                if(
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
            const widthPixels = renderPass.size[0] * scale.x;
            const offsetXPixels = renderPass.size[0] * ((translate.x + 1) * 0.5) * 1/devicePixelRatio;
            const offsetYPixels = renderPass.size[1] * ((-translate.y + 1) * 0.5) * 1/devicePixelRatio;
            const halfWidth=widthPixels*0.5* 1/devicePixelRatio
            let halfHeight:number;
            if (originalAspectRatio) {
                const heightPixels = widthPixels * originalAspectRatio;
                scale.y = heightPixels / renderPass.size[1];
                halfHeight = halfWidth * originalAspectRatio;
            } else {
                halfHeight=renderPass.size[1] * scale.y*0.5* 1/devicePixelRatio
            }
            this.#boundingBox.top = offsetYPixels - halfHeight;
            this.#boundingBox.bottom = offsetYPixels + halfHeight;
            this.#boundingBox.left = offsetXPixels - halfWidth;
            this.#boundingBox.right = offsetXPixels + halfWidth;

            if (borderSize.width > 0 || (typeof borderSize.height === "number" && borderSize.height > 0)) {
                const widthBorderPixels = renderPass.size[0] * borderSize.width;
                borderSize.height=widthBorderPixels/renderPass.size[1];
            }

            const newVertices = createVertexBuffer(scale, borderSize, textureView.texture.size, label);
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
