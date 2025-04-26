import { MutableTerraVector3, ReadOnlyTerraVector3 } from '../Math.js';
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
    this.id = engine.rust.new_mesh_camera(engine.canvas!.width, mesh_id);
    const gpulock = engine.rust.get_gpu();
    const cameralock = engine.rust.get_camera(gpulock, this.camera.id);
    const direction = new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_camera_direction_ptr(cameralock),
    );
    this.angle = Math.acos(direction[0]);
    engine.rust.drop_camera_lock(cameralock);
    engine.rust.drop_gpu_lock(gpulock);
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
          this.cursor = new UIRectangleBackground(
            {
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
            },
            {
              border_height: 0,
              border_width: 0,
              texture: bitmap,
            },
          );
        })
        .catch((err) => {
          engine.showError(err);
        });
    }
    this.#lockPointer();
    engine.addInputListener(this.#lockPointerListener);
  }
  updateMouseCoords = () => {
    engine.rust.update_canvas_width(this.id, engine.canvas!.width);
    const gpu = this.camera.gpu;
    if (gpu) {
      Atomics.store(
        gpu.mousePosition,
        0,
        gpu.renderPassCanvas.size.width * 0.5,
      );
      Atomics.store(
        gpu.mousePosition,
        1,
        gpu.renderPassCanvas.size.height * 0.5,
      );
      Atomics.notify(new Int32Array(gpu.mousePositionBuffer), 0);
    }
  };
  #lockPointer = () => {
    if (document.pointerLockElement) return;
    (engine.canvas!.requestPointerLock() as unknown as Promise<void>)
      .then(() => {
        const gpu = this.camera.gpu;
        if (gpu) {
          this.updateMouseCoords();
          gpu.renderPassCanvas.onResize.set(this, this.updateMouseCoords);
        }
      })
      .catch((err) => {
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
  lastTranslation = new MutableTerraVector3();
}
