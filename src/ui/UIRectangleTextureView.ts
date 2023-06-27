import type { TextureView } from '../GPU/TextureView.js';
import { UIRectangle } from './UIRectangle.js';
import type { Texture, TextureUsageValue } from '../GPU/Texture.js';
import type { Texture2dSize } from '../GPU/RenderTargets/RenderPassTarget.js';

export class UIRectangleTextureView extends UIRectangle {
    createTexture(): TextureView<Texture<GPUTextureFormat, TextureUsageValue, Texture2dSize>> {
        return this.textureView;
    }

    override updateBoundingBoxAndVertices({ vertices, content_sizeX, content_sizeY, outer_sizeX, outer_sizeY }: {
        vertices: Float32Array;
        content_sizeX: number;
        content_sizeY: number;
        outer_sizeX: number;
        outer_sizeY: number;
    }) {
        const { borderSize } = this.props
        const textureSize = this.textureView.texture.props.size;
        const uvs = {
            bottom: 0,
            left: textureSize.width,
            right: 0,
            top: textureSize.height,
        }
        vertices.set(
            [
                -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                content_sizeX, -content_sizeY, uvs.left, uvs.top,
                -content_sizeX, content_sizeY, uvs.right, uvs.bottom,

                -content_sizeX, content_sizeY, uvs.right, uvs.bottom,
                content_sizeX, -content_sizeY, uvs.left, uvs.top,
                content_sizeX, content_sizeY, uvs.left, uvs.bottom

            ]);

        if (borderSize.width[0] > 0 || (borderSize.height !== 'auto' && borderSize.height[0] > 0)) {
            //Left content_size
            vertices.set(
                [
                    -outer_sizeX, -content_sizeY, 0, uvs.top,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    -outer_sizeX, content_sizeY, 0, uvs.bottom,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    -content_sizeX, content_sizeY, uvs.right, uvs.bottom,
                    -outer_sizeX, content_sizeY, 0, uvs.bottom,


                    //right content_size

                    outer_sizeX, -content_sizeY, textureSize!.width, uvs.top,
                    content_sizeX, -content_sizeY, uvs.left, uvs.top,
                    outer_sizeX, content_sizeY, textureSize!.width, uvs.bottom,
                    content_sizeX, -content_sizeY, uvs.left, uvs.top,
                    content_sizeX, content_sizeY, uvs.left, uvs.bottom,
                    outer_sizeX, content_sizeY, textureSize!.width, uvs.bottom,
                    //bottom content_size

                    -content_sizeX, -outer_sizeY, uvs.right, textureSize!.height,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    content_sizeX, -outer_sizeY, uvs.left, textureSize!.height,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    content_sizeX, -outer_sizeY, uvs.left, textureSize!.height,
                    content_sizeX, -content_sizeY, uvs.left, uvs.top,

                    //top content_size

                    -content_sizeX, outer_sizeY, uvs.right, 0,
                    content_sizeX, outer_sizeY, uvs.left, 0,
                    content_sizeX, content_sizeY, uvs.left, uvs.bottom,
                    -content_sizeX, content_sizeY, uvs.right, uvs.bottom,
                    content_sizeX, content_sizeY, uvs.left, uvs.bottom,
                    -content_sizeX, outer_sizeY, uvs.right, 0,

                    //top left corner

                    -outer_sizeX, outer_sizeY, 0, 0,
                    -content_sizeX, content_sizeY, uvs.right, uvs.bottom,
                    -content_sizeX, outer_sizeY, uvs.right, 0,
                    -outer_sizeX, outer_sizeY, 0, 0,
                    -content_sizeX, content_sizeY, uvs.right, uvs.bottom,
                    -outer_sizeX, content_sizeY, 0, uvs.bottom,

                    //bottom left corner

                    -outer_sizeX, -outer_sizeY, 0, textureSize!.height,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    -content_sizeX, -outer_sizeY, uvs.right, textureSize!.height,
                    -outer_sizeX, -outer_sizeY, 0, textureSize!.height,
                    -content_sizeX, -content_sizeY, uvs.right, uvs.top,
                    -outer_sizeX, -content_sizeY, 0, uvs.top,

                    //top right corner

                    outer_sizeX, outer_sizeY, textureSize!.width, 0,
                    content_sizeX, content_sizeY, uvs.left, uvs.bottom,
                    content_sizeX, outer_sizeY, uvs.left, 0,
                    outer_sizeX, outer_sizeY, textureSize!.width, 0,
                    content_sizeX, content_sizeY, uvs.left, uvs.bottom,
                    outer_sizeX, content_sizeY, textureSize!.width, uvs.bottom,

                    //bottom right corner

                    outer_sizeX, -outer_sizeY, textureSize!.width, textureSize!.height,
                    content_sizeX, -content_sizeY, uvs.left, uvs.top,
                    content_sizeX, -outer_sizeY, uvs.left, textureSize!.height,
                    outer_sizeX, -outer_sizeY, textureSize!.width, textureSize!.height,
                    content_sizeX, -content_sizeY, uvs.left, uvs.top,
                    outer_sizeX, -content_sizeY, textureSize!.width, uvs.top,
                ], 24)
        }
        return vertices;
    }
}
