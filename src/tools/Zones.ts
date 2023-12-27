import { paintTexture } from '../paintGround/paintTexture.js';
import { Terrain } from '../world/Terrain.js';
import { PTDresult } from '../types/interfaces/index.js';
import type { GPU } from '../GPU.js';
import type { Scene } from '../Scene.js';
import type { Engine, ListenerObj } from '../engine.js';
import type { TopMenuButtonProps } from '../ui/topMenu.js';
import { Button } from '../ui/Button.js';
import { UI } from '../ui/UINode.js';
import { Anchor, NumericUnit } from '../ui/UIRectangle.js';
import {
  UIRectangleNodeHover,
  type UIRectangleNodeHoverProps,
} from '../ui/UIRectangleNode.js';
import {
  type RenderTargetTexture,
  Texture,
  TextureUsageEnums,
  TextureView,
} from '../webgpu-ts/index.js';
declare const engine: Engine;

const buttonProps = Button({
  UIRectangleProps: {
    label: 'residentalButton',
    scale: {
      min_width: 0.15,
      unit: NumericUnit['%'],
      y: 0.07,
    },
    translate: {
      x: {
        anchor: Anchor.CENTER,
        value: [-0.8, NumericUnit['%']],
      },
      //Will be overridden
      y: {
        anchor: Anchor.CENTER,
        value: [-0.8, NumericUnit['%']],
      },
    },
  },
  text: 'Residental (1)',
});

export class Zones extends UIRectangleNodeHover {
  #PT?: paintTexture;
  #size = 5120;
  readonly #ratio: number; //texture coordinates
  #zoneTexture?: RenderTargetTexture<
    'rgba8unorm',
    (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC']
  >;
  scene: Scene;
  private wasOpen = false;
  constructor(override props: UIRectangleNodeHoverProps & TopMenuButtonProps) {
    super(props);
    const initialScene = props.terrain.scenes[0];
    if (!initialScene) {
      throw new Error('scene not found');
    }
    this.scene = initialScene;

    this.#ratio = Terrain.size[0] / this.#size; //texture coordinates
  }
  #inputListener: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (e.code === 'Digit1') {
        this.paintZone();
      }
    },
    object: this,
    type: 'keydown',
  };
  paintZone() {
    if (this.#zoneTexture) {
      this.#PT = new paintTexture(
        this.scene,
        this.props.terrain,
        this.#zoneTexture,
        5120,
        5120,
        this.#ratio,
        (response) => {
          engine.DB?.transaction('zones', 'readwrite')
            .objectStore('zones')
            .put(response);
        },
      );
    }
  }
  override render(gpu: GPU, force: boolean) {
    super.render(gpu, force);
    if (this.props.open && !this.wasOpen) {
      this.wasOpen = true;
      this.#zoneTexture = new Texture({
        format: 'rgba8unorm',
        gpu: engine.gpu!.device,
        label: 'ZoneTexture',
        size: {
          height: 5120,
          width: 5120,
        },
        usages:
          TextureUsageEnums[
            'RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC'
          ],
      });
      engine.addInputListener(this.#inputListener);
      if (engine.DB) {
        const texture = new OffscreenCanvas(5120, 5120);
        const ctx = texture.getContext('2d');
        if (!ctx) throw new Error('getting 2d context failed');
        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, 5120, 5120);
        const centerX = this.#size / 2;
        const centerZ = this.#size / 2;
        engine.DB.transaction('zones').objectStore('zones').getAll().onsuccess =
          (evt) => {
            ctx.strokeStyle = 'blue';
            ctx.fillStyle = 'blue';
            ctx.lineWidth = 1;
            //@ts-ignore
            (evt.target.result as PTDresult[]).forEach((z) => {
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.translate(
                centerX + z.coord[0] / this.#ratio,
                centerZ + z.coord[1] / this.#ratio,
              );
              ctx.rotate(-z.rad);
              ctx.fillRect(
                0,
                0,
                -(z.size.height / this.#ratio),
                -(z.size.width / this.#ratio),
              );
            });
            ctx.stroke();
            this.#zoneTexture?.copyFromExternalImage(
              {
                source: texture,
              },
              {},
              {
                height: 5120,
                width: 5120,
              },
            );
          };
      }
      const staticScene = engine.scenes.get('static');
      if (!staticScene) {
        throw new Error('staticScene not found');
      }
      this.props.terrain.mesh.drawable?.setTexture(
        new TextureView(this.#zoneTexture),
      );
      this.props.terrain.mesh.set_scenes(staticScene.id);
    }
    if (this.props.open) {
      return [
        UI(
          UIRectangleNodeHover,
          Object.assign(buttonProps, {
            UIRectangleProps: {
              ...buttonProps.UIRectangleProps,
              translate: {
                ...buttonProps.UIRectangleProps.translate,
                y: this.props.subMenuPosition,
              },
            },
            events: {
              ...buttonProps.events,
              onClick: () => {
                this.paintZone();
              },
            },
          }),
        ),
      ];
    }
    if (!this.props.open && this.wasOpen) {
      this.props.terrain.mesh.set_scenes(this.scene.id);
      this.props.terrain.mesh.drawable?.setTexture(
        new TextureView(this.props.terrain.texture),
      );
      this.#zoneTexture?.destroy();
      this.#PT?.destroy();
      this.wasOpen = false;
      engine.clearInputListeners(this);
    }
    return null;
  }
  override destroy(): void {
    super.destroy();
    this.#PT?.destroy();
    engine.clearInputListeners(this);
  }
}
