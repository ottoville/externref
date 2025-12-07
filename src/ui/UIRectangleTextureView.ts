import type {
  Texture,
  Texture2dSize,
  TextureUsageEnums,
  TextureView,
} from '../webgpu-ts/index.js';
import { UIRectangle } from './UIRectangle.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export class UIRectangleTextureView extends UIRectangle {
  createTexture():
    | TextureView<Texture<TextureUsageEnums, GPUTextureFormat, Texture2dSize>>
    | GPUTextureView
    | rust_pointer<'texture'> {
    return this.textureView;
  }

  override updateBoundingBoxAndVertices({
    vertices,
    content_sizeX,
    content_sizeY,
    outer_sizeX,
    outer_sizeY,
    width,
    height,
  }: {
    vertices: Float32Array;
    content_sizeX: number;
    content_sizeY: number;
    outer_sizeX: number;
    outer_sizeY: number;
    width: number;
    height: number;
  }) {
    const { borderSize } = this.props;
    const uvs = {
      bottom: 0,
      left: width,
      right: 0,
      top: height,
    };
    vertices.set([
      -content_sizeX,
      -content_sizeY,
      uvs.right,
      uvs.top,
      content_sizeX,
      -content_sizeY,
      uvs.left,
      uvs.top,
      -content_sizeX,
      content_sizeY,
      uvs.right,
      uvs.bottom,
      -content_sizeX,
      content_sizeY,
      uvs.right,
      uvs.bottom,
      content_sizeX,
      -content_sizeY,
      uvs.left,
      uvs.top,
      content_sizeX,
      content_sizeY,
      uvs.left,
      uvs.bottom,
    ]);
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
          uvs.top,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          -outer_sizeX,
          content_sizeY,
          0,
          uvs.bottom,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          -content_sizeX,
          content_sizeY,
          uvs.right,
          uvs.bottom,
          -outer_sizeX,
          content_sizeY,
          0,
          uvs.bottom,

          //right content_size

          outer_sizeX,
          -content_sizeY,
          width,
          uvs.top,
          content_sizeX,
          -content_sizeY,
          uvs.left,
          uvs.top,
          outer_sizeX,
          content_sizeY,
          width,
          uvs.bottom,
          content_sizeX,
          -content_sizeY,
          uvs.left,
          uvs.top,
          content_sizeX,
          content_sizeY,
          uvs.left,
          uvs.bottom,
          outer_sizeX,
          content_sizeY,
          width,
          uvs.bottom,
          //bottom content_size

          -content_sizeX,
          -outer_sizeY,
          uvs.right,
          height,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          content_sizeX,
          -outer_sizeY,
          uvs.left,
          height,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          content_sizeX,
          -outer_sizeY,
          uvs.left,
          height,
          content_sizeX,
          -content_sizeY,
          uvs.left,
          uvs.top,

          //top content_size

          -content_sizeX,
          outer_sizeY,
          uvs.right,
          0,
          content_sizeX,
          outer_sizeY,
          uvs.left,
          0,
          content_sizeX,
          content_sizeY,
          uvs.left,
          uvs.bottom,
          -content_sizeX,
          content_sizeY,
          uvs.right,
          uvs.bottom,
          content_sizeX,
          content_sizeY,
          uvs.left,
          uvs.bottom,
          -content_sizeX,
          outer_sizeY,
          uvs.right,
          0,

          //top left corner

          -outer_sizeX,
          outer_sizeY,
          0,
          0,
          -content_sizeX,
          content_sizeY,
          uvs.right,
          uvs.bottom,
          -content_sizeX,
          outer_sizeY,
          uvs.right,
          0,
          -outer_sizeX,
          outer_sizeY,
          0,
          0,
          -content_sizeX,
          content_sizeY,
          uvs.right,
          uvs.bottom,
          -outer_sizeX,
          content_sizeY,
          0,
          uvs.bottom,

          //bottom left corner

          -outer_sizeX,
          -outer_sizeY,
          0,
          height,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          -content_sizeX,
          -outer_sizeY,
          uvs.right,
          height,
          -outer_sizeX,
          -outer_sizeY,
          0,
          height,
          -content_sizeX,
          -content_sizeY,
          uvs.right,
          uvs.top,
          -outer_sizeX,
          -content_sizeY,
          0,
          uvs.top,

          //top right corner

          outer_sizeX,
          outer_sizeY,
          width,
          0,
          content_sizeX,
          content_sizeY,
          uvs.left,
          uvs.bottom,
          content_sizeX,
          outer_sizeY,
          uvs.left,
          0,
          outer_sizeX,
          outer_sizeY,
          width,
          0,
          content_sizeX,
          content_sizeY,
          uvs.left,
          uvs.bottom,
          outer_sizeX,
          content_sizeY,
          width,
          uvs.bottom,

          //bottom right corner

          outer_sizeX,
          -outer_sizeY,
          width,
          height,
          content_sizeX,
          -content_sizeY,
          uvs.left,
          uvs.top,
          content_sizeX,
          -outer_sizeY,
          uvs.left,
          height,
          outer_sizeX,
          -outer_sizeY,
          width,
          height,
          content_sizeX,
          -content_sizeY,
          uvs.left,
          uvs.top,
          outer_sizeX,
          -content_sizeY,
          width,
          uvs.top,
        ],
        24,
      );
    }
  }
}
