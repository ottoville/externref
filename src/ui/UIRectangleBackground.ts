import { TextureView } from '../GPU/TextureView.js';
import type { UIRectangleProps } from './UIRectangle.js';
import type { TextUV } from './UIRectangleTextOnly.js';
import { UIRectangleText } from './UIRectangleText.js';
import type {
  Texture,
  Texture2dSize,
  TextureUsageEnums,
} from '../webgpu-ts/Texture.js';
export const font = '80pt serif';

export function createBackground(
  width: number,
  height: number,
  text: string,
  originalAspectRatio?: number,
) {
  const copySource2 = new OffscreenCanvas(width, height);
  const ctx = copySource2.getContext('2d');
  if (!ctx) {
    throw new Error('Cant get 2d context for texture text');
  }

  ctx.textBaseline = 'top';
  ctx.font = font;
  const measuredSize = ctx.measureText(text);

  const textSize = {
    height:
      measuredSize.actualBoundingBoxAscent +
      measuredSize.actualBoundingBoxDescent,
    width: measuredSize.width,
  };
  const originalTextHeight = textSize.height;
  if (originalAspectRatio) {
    //Keep text aspect ratio normal
    const textAspectRatio = textSize.height / textSize.width;
    if (textAspectRatio > originalAspectRatio) {
      //need to add borders to left and right
      textSize.width = textSize.height / originalAspectRatio;
    } else if (textAspectRatio < originalAspectRatio) {
      //need to add borders to top and bottom
      textSize.height = textSize.width * originalAspectRatio;
    }
  }
  return {
    copySource2,
    ctx,
    measuredSize,
    originalTextHeight,
    textSize,
  };
}
function createTexture(
  backgroundAsset: {
    texture: ImageBitmap;
    readonly border_width: number;
    readonly border_height: number;
  },
  textUV: [
    topLeft: [number, number],
    topRight: [number, number],
    bottomRight: [number, number],
    bottomLeft: [number, number],
  ],
  originalAspectRatio?: number,
  text?: string,
): ImageBitmap | OffscreenCanvas {
  let copySource: ImageBitmap | OffscreenCanvas = backgroundAsset.texture;
  // Create texture for text
  if (text) {
    const { originalTextHeight, textSize, measuredSize, copySource2, ctx } =
      createBackground(
        backgroundAsset.texture.width,
        backgroundAsset.texture.height,
        text,
        originalAspectRatio,
      );
    copySource = copySource2;
    const extendedSize = {
      height: backgroundAsset.texture.height + textSize.height,
      width: Math.max(backgroundAsset.texture.width, textSize.width),
    };
    copySource.width = extendedSize.width;
    copySource.height = extendedSize.height;
    ctx.drawImage(backgroundAsset.texture, 0, 0);

    const borderSizeInPixel = {
      height: backgroundAsset.texture.height * backgroundAsset.border_height,
      width: backgroundAsset.texture.width * backgroundAsset.border_width,
    };

    const contentSize = {
      height: backgroundAsset.texture.height - borderSizeInPixel.height * 2,
      width: backgroundAsset.texture.width - borderSizeInPixel.width * 2,
    };

    ctx.drawImage(
      backgroundAsset.texture,
      borderSizeInPixel.width,
      borderSizeInPixel.height,
      contentSize.width,
      contentSize.height,
      0,
      backgroundAsset.texture.height,
      extendedSize.width,
      textSize.height,
    );
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const verticalTextMargin = textSize.height - originalTextHeight;
    ctx.fillText(
      text,
      extendedSize.width * 0.5,
      backgroundAsset.texture.height +
        measuredSize.actualBoundingBoxAscent +
        verticalTextMargin * 0.5,
    );
    /*if (label === 'MSAA' || label === 'Close') {
            // eslint-disable-next-line promise/catch-or-return
            copySource.convertToBlob().then(b => { console.log(URL.createObjectURL(b!)) })
        }*/
    textUV[0] = [0, backgroundAsset.texture.height];
    textUV[1] = [extendedSize.width, backgroundAsset.texture.height];
    textUV[2] = [extendedSize.width, extendedSize.height];
    textUV[3] = [0, extendedSize.height];
  }
  return copySource;
}
/*
    Draws rectangle.
*/
export class UIRectangleBackground extends UIRectangleText {
  createTexture(): TextureView<
    Texture<GPUTextureFormat, TextureUsageEnums, Texture2dSize>
  > {
    const copySource = createTexture(
      this.backgroundAsset,
      this.textUV,
      this.props.originalAspectRatio,
      this.text,
    );
    return this.createTextureView(copySource);
  }
  override updateBoundingBoxAndVertices(args: {
    vertices: Float32Array;
    content_sizeX: number;
    content_sizeY: number;
    outer_sizeX: number;
    outer_sizeY: number;
  }) {
    const { vertices, content_sizeX, content_sizeY, outer_sizeX, outer_sizeY } =
      args;
    const { borderSize } = this.props;
    const texture = this.backgroundAsset.texture;
    const container_uvs = {
      bottom: this.backgroundAsset.border_height * texture.height,
      left: (1 - this.backgroundAsset.border_width) * texture.width,
      right: this.backgroundAsset.border_width * texture.width,
      top: (1 - this.backgroundAsset.border_height) * texture.height,
    };
    if (this.text) {
      super.updateBoundingBoxAndVertices(args);
    } else {
      vertices.set([
        -content_sizeX,
        -content_sizeY,
        container_uvs.right,
        container_uvs.top,

        content_sizeX,
        -content_sizeY,
        container_uvs.left,
        container_uvs.top,

        -content_sizeX,
        content_sizeY,
        container_uvs.right,
        container_uvs.bottom,

        -content_sizeX,
        content_sizeY,
        container_uvs.right,
        container_uvs.bottom,

        content_sizeX,
        -content_sizeY,
        container_uvs.left,
        container_uvs.top,

        content_sizeX,
        content_sizeY,
        container_uvs.left,
        container_uvs.bottom,
      ]);
    }
    if (
      borderSize.width[0] > 0 ||
      (borderSize.height !== 'auto' && borderSize.height[0] > 0)
    ) {
      //Left content_size
      vertices.set(
        [
          -outer_sizeX,
          -content_sizeY,
          0,
          container_uvs.top,
          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,
          -outer_sizeX,
          content_sizeY,
          0,
          container_uvs.bottom,
          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,
          -content_sizeX,
          content_sizeY,
          container_uvs.right,
          container_uvs.bottom,
          -outer_sizeX,
          content_sizeY,
          0,
          container_uvs.bottom,

          //right content_size

          outer_sizeX,
          -content_sizeY,
          texture.width,
          container_uvs.top,

          content_sizeX,
          -content_sizeY,
          container_uvs.left,
          container_uvs.top,

          outer_sizeX,
          content_sizeY,
          texture.width,
          container_uvs.bottom,

          content_sizeX,
          -content_sizeY,
          container_uvs.left,
          container_uvs.top,

          content_sizeX,
          content_sizeY,
          container_uvs.left,
          container_uvs.bottom,

          outer_sizeX,
          content_sizeY,
          texture.width,
          container_uvs.bottom,
          //bottom content_size

          -content_sizeX,
          -outer_sizeY,
          container_uvs.right,
          texture.height,

          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,

          content_sizeX,
          -outer_sizeY,
          container_uvs.left,
          texture.height,

          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,

          content_sizeX,
          -outer_sizeY,
          container_uvs.left,
          texture.height,

          content_sizeX,
          -content_sizeY,
          container_uvs.left,
          container_uvs.top,

          //top content_size

          -content_sizeX,
          outer_sizeY,
          container_uvs.right,
          0,

          content_sizeX,
          outer_sizeY,
          container_uvs.left,
          0,

          content_sizeX,
          content_sizeY,
          container_uvs.left,
          container_uvs.bottom,

          -content_sizeX,
          content_sizeY,
          container_uvs.right,
          container_uvs.bottom,

          content_sizeX,
          content_sizeY,
          container_uvs.left,
          container_uvs.bottom,

          -content_sizeX,
          outer_sizeY,
          container_uvs.right,
          0,

          //top left corner

          -outer_sizeX,
          outer_sizeY,
          0,
          0,

          -content_sizeX,
          content_sizeY,
          container_uvs.right,
          container_uvs.bottom,

          -content_sizeX,
          outer_sizeY,
          container_uvs.right,
          0,

          -outer_sizeX,
          outer_sizeY,
          0,
          0,

          -content_sizeX,
          content_sizeY,
          container_uvs.right,
          container_uvs.bottom,

          -outer_sizeX,
          content_sizeY,
          0,
          container_uvs.bottom,

          //bottom left corner

          -outer_sizeX,
          -outer_sizeY,
          0,
          texture.height,

          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,

          -content_sizeX,
          -outer_sizeY,
          container_uvs.right,
          texture.height,

          -outer_sizeX,
          -outer_sizeY,
          0,
          texture.height,

          -content_sizeX,
          -content_sizeY,
          container_uvs.right,
          container_uvs.top,

          -outer_sizeX,
          -content_sizeY,
          0,
          container_uvs.top,

          //top right corner

          outer_sizeX,
          outer_sizeY,
          texture.width,
          0,

          content_sizeX,
          content_sizeY,
          container_uvs.left,
          container_uvs.bottom,

          content_sizeX,
          outer_sizeY,
          container_uvs.left,
          0,

          outer_sizeX,
          outer_sizeY,
          texture.width,
          0,

          content_sizeX,
          content_sizeY,
          container_uvs.left,
          container_uvs.bottom,

          outer_sizeX,
          content_sizeY,
          texture.width,
          container_uvs.bottom,

          //bottom right corner

          outer_sizeX,
          -outer_sizeY,
          texture.width,
          texture.height,

          content_sizeX,
          -content_sizeY,
          container_uvs.left,
          container_uvs.top,

          content_sizeX,
          -outer_sizeY,
          container_uvs.left,
          texture.height,

          outer_sizeX,
          -outer_sizeY,
          texture.width,
          texture.height,

          content_sizeX,
          -content_sizeY,
          container_uvs.left,
          container_uvs.top,

          outer_sizeX,
          -content_sizeY,
          texture.width,
          container_uvs.top,
        ],
        24,
      );
    }
    return vertices;
  }
  constructor(
    props: UIRectangleProps,
    /**
        border_width: Relative width of border in texture UV mapping, between 0 and 1
        border_height: Relative height of border in texture UV mapping, between 0 and 1
     */
    private backgroundAsset: {
      texture: ImageBitmap;
      readonly border_width: number;
      readonly border_height: number;
    },
    public text?: string,
  ) {
    const textUV: TextUV = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    super(
      props,
      createTexture(backgroundAsset, textUV, props.originalAspectRatio, text),
    );
    this.textUV = textUV;
  }
}
