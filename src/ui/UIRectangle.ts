import type { RenderPass } from '../GPU/RenderPasses/RenderPass.js';
import type { Engine, ListenerObj } from '../engine.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import type { LegacyRenderPipeline } from '../GPU/RenderPipeline.js';
import type { UIVertShader } from '../GPU/Shaders/UI.vert.js';
import { DataNode, allocate_vec } from '../nodes/DataNode.js';
import type { GPU } from '../GPU.js';
import {
  RenderTarget,
  type TEXTURE_BINDING_TEXTURE,
  type Texture,
  type Texture2dSize,
  TextureUsageEnums,
  TextureView,
  BindGroup,
  Buffer,
  BufferUsageEnums,
} from '../webgpu-ts/index.js';
declare const engine: Engine;

export const enum NumericUnit {
  px,
  '%',
}
export const enum Anchor {
  CENTER,
  TOP,
  BOTTOM,
  LEFT,
  RIGHT,
}

type ValueUnit =
  | readonly [value: number, unit: NumericUnit]
  | readonly [value: 0];

export type VerticalPosition = {
  value: ValueUnit;
  anchor: Anchor.CENTER | Anchor.TOP | Anchor.BOTTOM;
};
type HorizontalPosition = {
  value: ValueUnit;
  anchor: Anchor.CENTER | Anchor.LEFT | Anchor.RIGHT;
};

type ButtonSize = {
  min_width: number;
  /**
   * Ignored if originalAspectRatio is set
   */
  y: number;
  unit: NumericUnit;
};

type ButtonPosition = {
  x: HorizontalPosition;
  y: VerticalPosition;
};

export type UIRectangleProps<
  P extends GPU['UIPipeline'] /* | GPU['UIPipelineArray']*/ = GPU['UIPipeline'],
  /*| GPU['UIPipelineArray']*/
> = {
  canvaspipeline: P;
  renderPass: RenderPass;
  label: string;
  /**
        width: Relative width of borders to viewport, value between 0 and 1
        height: Relative height of borders to viewport, value between 0 and 1
                If "auto", it is calculated to be same than width
    */
  borderSize: {
    width: ValueUnit;
    height: ValueUnit | 'auto';
  };
  /**
        Size of the button.
        Border size is taken account to scale.
        Y is Ignored if originalAspectRatio is set.
    */
  scale: ButtonSize;
  /**
   * Values between -1 and 1
   * Origin 0,0 is at center of the viewport,
   *  -1, 1 is left top
   */
  translate: ButtonPosition;
  originalAspectRatio?: number | undefined;
  events?: {
    onClick?: (e: PointerEvent) => void;
  };
};
/*
    Draws rectangle.
*/
type RectangleTexture = RenderTarget<
  'bgra8unorm',
  (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST'],
  { width: number; height: number; depthOrArrayLayers: number }
>;
export abstract class UIRectangle<
  P extends GPU['UIPipeline'] /*| GPU['UIPipelineArray']*/ = GPU['UIPipeline'],
  /*| GPU['UIPipelineArray']*/
> extends DataNode {
  override drawable?:
    | DrawableSimple<LegacyRenderPipeline<UIVertShader>>
    | undefined = undefined;
  boundingBox = {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  };
  texture?: RectangleTexture | undefined;
  uniformBuffer: Buffer<(typeof BufferUsageEnums)['UNIFORM|COPY_DST']>;
  textureView: TextureView<
    /*P extends GPU['UIPipelineArray']
      ? RectangleTexture
      :*/ Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE, Texture2dSize>
  >;

  protected createTextureView(copySource: ImageBitmap | OffscreenCanvas) {
    if (this.drawable && this.texture) {
      if (
        copySource.width > this.texture.props.size.width ||
        copySource.height > this.texture.props.size.height
      ) {
        this.texture.destroy();
        this.texture = undefined;
        const vertices = this.#updateBoundingBoxAndVerticesSuper();
        const vertices_ptr = allocate_vec(vertices);
        this.drawable.setVertexBuffer(0, {
          stride: 3,
          view: vertices_ptr,
        });
        this.set_vertices(vertices_ptr, 3);
      }
    }
    if (!this.texture) {
      const frag = this.props.canvaspipeline.props.builder.fragmentShader;
      let structName: string;
      if ('main' in frag.props.entryPoints) {
        structName =
          frag.props.pipelineLayouts[0]!.bindGroupLayouts[0].entries.texture
            .structName;
      } else {
        structName =
          frag.props.pipelineLayouts[0]!.bindGroupLayouts[0].entries.texture
            .structName;
      }
      this.texture = new RenderTarget({
        format: 'bgra8unorm',
        gpu: this.props.canvaspipeline.props.builder.vertexShader.props
          .pipelineLayouts[0]!.gpu,
        label: 'button_' + this.props.label + '_UIRectangle_text',
        size: {
          depthOrArrayLayers: structName.includes('array') ? 2 : 1,
          height: copySource.height,
          width: copySource.width,
        },
        usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST'],
      });
    }
    this.texture.copyFromExternalImage(
      {
        source: copySource,
      },
      {
        origin: {
          x: 0,
          y: 0,
        },
      },
      {
        height: copySource.height,
        width: copySource.width,
      },
    );
    this.textureView = new TextureView(this.texture);
    return this.textureView;
  }
  abstract createTexture(): TextureView<
    Texture<GPUTextureFormat, TextureUsageEnums, Texture2dSize>
  >;
  protected updatePosition(buffer: ArrayBuffer) {
    const b = new Float32Array(buffer);
    if (this.props.translate.x.value[1] === NumericUnit['%']) {
      var XPosition = this.props.translate.x.value[0];
    } else {
      //pixels
      var XPosition =
        (this.props.translate.x.value[0] / this.props.renderPass.size.width) *
        2;
    }
    if (this.props.translate.x.anchor === Anchor.RIGHT) {
      XPosition = -XPosition + 1;
    } else if (this.props.translate.x.anchor === Anchor.LEFT) {
      XPosition = XPosition - 1;
    }
    b[0] = XPosition;
    if (this.props.translate.y.value[1] === NumericUnit['%']) {
      var YPosition = this.props.translate.y.value[0];
    } else {
      //pixels
      var YPosition =
        (this.props.translate.y.value[0] / this.props.renderPass.size.height) *
        2;
    }
    if (this.props.translate.y.anchor === Anchor.TOP) {
      YPosition = -YPosition + 1;
    } else if (this.props.translate.y.anchor === Anchor.BOTTOM) {
      YPosition = YPosition - 1;
    }
    b[1] = YPosition;
  }
  #updateBoundingBoxAndVerticesSuper() {
    const { scale, renderPass, originalAspectRatio, translate } = this.props;
    if (
      this.props.translate.x.value[1] === NumericUnit.px ||
      this.props.translate.y.value[1] === NumericUnit.px
    ) {
      const buff = new ArrayBuffer(8);
      this.updatePosition(buff);
      this.uniformBuffer.write(0, buff);
    }
    let widthPixels: number;
    if (scale.unit === NumericUnit['%']) {
      widthPixels = renderPass.size.width * scale.min_width;
    } else {
      widthPixels = scale.min_width;
    }
    if (originalAspectRatio) {
      const heightPixels = widthPixels * originalAspectRatio;
      if (scale.unit === NumericUnit['%']) {
        scale.y = heightPixels / renderPass.size.height;
      } else {
        scale.y = heightPixels;
      }
    }
    if (this.props.events) {
      const halfWidth = widthPixels * 0.5;
      let halfHeight: number;
      if (originalAspectRatio) halfHeight = halfWidth * originalAspectRatio;
      else {
        if (scale.unit === NumericUnit['%'])
          halfHeight = renderPass.size.height * scale.y * 0.5;
        else halfHeight = scale.y * 0.5;
      }
      let movementXPixels = translate.x.value[0];
      if (translate.x.value[1] === NumericUnit['%']) {
        movementXPixels = translate.x.value[0] * renderPass.size.width * 0.5;
      }
      if (translate.x.anchor === Anchor.RIGHT) {
        movementXPixels = renderPass.size.width - movementXPixels;
      } else if (translate.x.anchor === Anchor.CENTER) {
        movementXPixels = movementXPixels + renderPass.size.width * 0.5;
      }
      let movementYPixels = translate.y.value[0];
      if (translate.y.value[1] === NumericUnit['%']) {
        movementYPixels = translate.y.value[0] * renderPass.size.height * 0.5;
      }
      if (translate.y.anchor === Anchor.BOTTOM) {
        movementYPixels = renderPass.size.height - movementYPixels;
      } else if (translate.y.anchor === Anchor.CENTER) {
        movementYPixels = renderPass.size.height * 0.5 - movementYPixels;
      }

      this.boundingBox.top = (movementYPixels - halfHeight) / devicePixelRatio;
      this.boundingBox.bottom =
        (movementYPixels + halfHeight) / devicePixelRatio;
      this.boundingBox.left = (movementXPixels - halfWidth) / devicePixelRatio;
      this.boundingBox.right = (movementXPixels + halfWidth) / devicePixelRatio;
    }

    const { borderSize, label } = this.props;
    let widthBorderPixels: number;
    let heightBorderPixels: number;
    let widthBorderRelative: number;
    let heightBorderRelative: number;
    if (borderSize.width[1] === NumericUnit['%']) {
      widthBorderPixels = renderPass.size.width * borderSize.width[0];
      widthBorderRelative = borderSize.width[0];
    } else {
      widthBorderPixels = borderSize.width[0];
      widthBorderRelative = widthBorderPixels / renderPass.size.width;
    }
    if (borderSize.height !== 'auto') {
      if (borderSize.height[1] === NumericUnit['%']) {
        heightBorderPixels = renderPass.size.height * borderSize.height[0];
        heightBorderRelative = borderSize.height[0];
      } else {
        heightBorderPixels = borderSize.height[0];
        heightBorderRelative = heightBorderPixels / renderPass.size.height;
      }
    } else {
      heightBorderRelative = widthBorderPixels / renderPass.size.height;
    }
    let outer_sizeX: number;
    let outer_sizeY: number;
    if (scale.unit === NumericUnit['%']) {
      outer_sizeX = scale.min_width;
      outer_sizeY = scale.y;
    } else {
      outer_sizeX = scale.min_width / renderPass.size.width;
      outer_sizeY = scale.y / renderPass.size.height;
    }

    const content_sizeX = outer_sizeX - widthBorderRelative;
    const content_sizeY = outer_sizeY - heightBorderRelative;
    if (content_sizeX <= 0 || content_sizeY <= 0) {
      console.warn('UI', label, 'element content size is 0 or below');
    }
    const positionsCount =
      borderSize.width[0] > 0 ||
      (Array.isArray(borderSize.height) && borderSize.height[0] > 0)
        ? 54
        : 6;
    const vertices = new Float32Array(positionsCount * 4);
    return this.updateBoundingBoxAndVertices({
      content_sizeX,
      content_sizeY,
      outer_sizeX,
      outer_sizeY,
      vertices,
    });
  }
  abstract updateBoundingBoxAndVertices(params: {
    vertices: Float32Array;
    content_sizeX: number;
    content_sizeY: number;
    outer_sizeX: number;
    outer_sizeY: number;
  }): Float32Array;

  constructor(
    protected props: UIRectangleProps<P>,
    texture:
      | TextureView<
          /* P extends GPU['UIPipelineArray']
            ? RectangleTexture
            :*/ Texture<
            GPUTextureFormat,
            TEXTURE_BINDING_TEXTURE,
            Texture2dSize
          >
        >
      | ImageBitmap
      | OffscreenCanvas,
  ) {
    props.label = props.label + '_UIRectangle';
    super(
      {
        character_can_collide_to: false,
        vertices: {
          stride: 3,
          view: allocate_vec(new Float32Array(9)),
        },
      },
      {
        label: props.label,
      },
    );
    const { canvaspipeline, renderPass, label, borderSize, events } = props;
    //canvaspipeline.props.bindgroupdrawable.bindGroupLayouts[0].entries.texture
    this.positions_count =
      borderSize.width[0] > 0 ||
      (Array.isArray(borderSize.height) && borderSize.height[0] > 0)
        ? 54
        : 6;
    this.uniformBuffer = new Buffer(
      {
        gpu: renderPass.props.gpu,
        label: 'UI_transform',
        size: 8,
        usages: BufferUsageEnums['UNIFORM|COPY_DST'],
      },
      (buff) => {
        this.updatePosition(buff.getMappedRange());
      },
    );
    const onClick = events?.onClick;
    if (onClick) {
      const checkClickArea = (e: PointerEvent) => {
        return (
          e.offsetX > this.boundingBox.left &&
          e.offsetX < this.boundingBox.right &&
          e.offsetY > this.boundingBox.top &&
          e.offsetY < this.boundingBox.bottom
        );
      };
      let pointerDown = false;
      engine.addInputListener({
        cb: (e) => {
          if (pointerDown && checkClickArea(e)) {
            onClick(e);
            return true;
          }
          return false;
        },
        object: this,
        options: {
          ui: true,
        },
        type: 'pointerup',
      } as ListenerObj<'pointerup'>);
      engine.addInputListener({
        cb: (e) => {
          if (checkClickArea(e)) {
            pointerDown = true;
            return true;
          }
          return false;
        },
        object: this,
        options: {
          ui: true,
        },
        type: 'pointerdown',
      } as ListenerObj<'pointerdown'>);
    }
    if (!(texture instanceof TextureView)) {
      this.textureView = this.createTextureView(texture);
    } else {
      this.textureView = texture;
    }
    queueMicrotask(() => {
      const vertices = this.#updateBoundingBoxAndVerticesSuper();
      const vertices_ptr = allocate_vec(vertices);
      this.set_vertices(vertices_ptr, 3);

      const drawable = new DrawableSimple(
        {
          bindGroups: [
            {
              bindGroup: new BindGroup(
                engine.gpu!.BindGroupLayoutCanvas,
                'UI_bindgroup_' + label,
                (bindGroup) => {
                  return {
                    texture: this.textureView,
                    uniforms: this.uniformBuffer.getUniformBinding(bindGroup),
                  };
                },
              ),
              offsets: [],
            },
          ],
          node: this,
          renderPasses: new Set([renderPass]),
          renderPipeline: canvaspipeline as GPU['UIPipeline'],
          /* | GPU['UIPipelineArray']*/ vertexBuffers: [
            {
              stride: 3,
              view: vertices_ptr,
            },
          ],
        },
        {
          firstInstance: 0,
          instanceCount: 1,
        },
        {
          firstVertex: 0,
        },
      );
      this.drawable = drawable;
      renderPass.onResize.set(this, () => {
        const newVertices = this.#updateBoundingBoxAndVerticesSuper();
        const new_vertices_ptr = allocate_vec(newVertices);
        this.set_vertices(new_vertices_ptr, 3);
        drawable.setVertexBuffer(0, {
          stride: 3,
          view: new_vertices_ptr,
        });
      });

      /*this.drawable.staticBindGroup = new BindGroup(
        canvaspipeline.props.vertexShader.props.pipelineLayouts[0]!.bindGroupLayouts[0]!,
        //canvaspipeline.props.vertexShader.props.entryPoints.main.pipelineLayout.bindGroupLayouts[0],
        'UI_bindgroup_' + label,
        (bindGroup) => {
          return {
            texture: this.textureView,
            uniforms: this.uniformBuffer.getUniformBinding(bindGroup),
          };
        },
      );*/
    });
  }
  override destroy() {
    super.destroy();
    this.props.renderPass.onResize.delete(this);
    engine.clearInputListeners(this);
    this.drawable?.destroy();
  }
}
