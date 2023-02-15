import { TextureView } from "../GPU/TextureView.js";
import { Texture2D } from "../GPU/Texture2D.js";
import { UIRectangle, UIRectangleProps } from "./UIRectangle.js";

/*
    Draws rectangle.
*/
export class UIRectangleTextureView extends UIRectangle {
    createTexture(): TextureView<Texture2D> {
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
        const textureSize = this.textureView.texture.size;
        const uvs = {
            top: textureSize.height,
            bottom: 0,
            right: 0,
            left: textureSize.width
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

        if (borderSize.width[0] > 0 || (borderSize.height !== "auto" && borderSize.height[0] > 0)) {
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
    constructor(props: UIRectangleProps,
        textureView: TextureView<Texture2D>
    ) {
        super(props, textureView);
        const {
            label,
            borderSize,
        } = props;
        this.positions_count = (borderSize.width[0] > 0 || borderSize.height[0] > 0) ? 54 : 6;
        this.label = label + '_UIRectangle';

    }
}
