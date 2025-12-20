import type { TerraCamera } from '../TerraCamera.js';
import type { Engine, ListenerObj } from '../engine.js';
import { CameraController } from './CameraController.js';
import { Anchor, NumericUnit, UIRectangle } from '../ui/UIRectangle.js';
import { UIRectangleBackground } from '../ui/UIRectangleBackground.js';
declare const engine: Engine;

const cursorBitmap: Promise<ImageBitmap> =
  typeof globalThis.createImageBitmap !== 'undefined'
    ? fetch('/assets/cursor.webp')
        .then((asset) => asset.blob())
        .then(createImageBitmap)
    : Promise.resolve<ImageBitmap>({} as ImageBitmap);
export class MeshCamera extends CameraController {
  name = 'PositionCamera';
  angle = Math.PI;
  verticalAngle = Math.PI * 0.5;

  cursor: UIRectangle | undefined = undefined;
  id: rust_pointer<'meshcamera'>;

  constructor(
    public camera: TerraCamera,
    mesh_id: rust_pointer<'mesh_id'>,
  ) {
    super();
    this.id = engine.rust.new_mesh_camera(mesh_id);
    const direction = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.get_camera_direction_ptr(this.camera.id),
      3,
    );
    this.angle = Math.acos(direction[0]!);
  }
  deAttachCameraController() {
    document.exitPointerLock();
    engine.clearInputListeners(this);
    this.cursor?.destroy();
    this.camera.gpu?.renderPassCanvas.onResize.delete(this);
  }
  attachCameraController() {
    const gpu = this.camera.gpu;
    if (gpu) {
      cursorBitmap
        .then((bitmap) => {
          this.cursor = new UIRectangleBackground({
            backgroundAsset: {
              border_height: 0,
              border_width: 0,
              texture: bitmap,
            },
            borderSize: {
              height: 'auto',
              width: [0],
            },
            canvaspipeline: gpu.UIPipeline,
            label: 'cursor',
            originalAspectRatio: 1,
            renderPass: gpu.renderPassCanvas,
            scale: {
              min_width: 0.01,
              unit: NumericUnit['%'],
              y: 0.01,
            },
            translate: {
              x: {
                anchor: Anchor.CENTER,
                value: [0],
              },
              y: {
                anchor: Anchor.CENTER,
                value: [0],
              },
            },
          });
        })
        .catch((err) => {
          engine.showError(err);
        });
    }
    this.#lockPointer();
    engine.addInputListener(this.#lockPointerListener);
  }
  #lockPointer = () => {
    if (document.pointerLockElement) return;
    engine.canvas!.requestPointerLock().catch((err) => {
      engine.showError(err);
    });
  };
  #lockPointerListener: ListenerObj<'pointerdown'> = {
    cb: () => {
      this.#lockPointer();
    },
    object: this,
    type: 'pointerdown',
  };

  serialize = () => {
    return;
  };
}
