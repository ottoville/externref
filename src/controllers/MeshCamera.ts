import { MutableTerraVector3, ReadOnlyTerraVector3 } from '../Math.js';
import type { TerraCamera } from '../TerraCamera.js';
import type { Engine, ListenerObj } from '../engine.js';
import { ARROW_KEYS, CameraController } from './CameraController.js';
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
  arrowKeysDown = 0;
  pointerMovement = {
    x: 0,
    y: 0,
  };
  cursor: UIRectangle | undefined = undefined;
  constructor(public camera: TerraCamera) {
    super();
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
  checkInputs() {
    if (this.pointerMovement.x || this.pointerMovement.y) {
      if (this.pointerMovement.x) {
        this.angle += (Math.PI * this.pointerMovement.x) / engine.canvas!.width;
        this.pointerMovement.x = 0;
      }
      if (this.pointerMovement.y) {
        this.verticalAngle -=
          (Math.PI * this.pointerMovement.y) / engine.canvas!.width;
        this.pointerMovement.y = 0;
      }
      if (this.angle < 0) {
        this.angle = Math.PI * 2 + this.angle;
      }
      if (this.angle < 0) {
        throw new Error('negative angle');
      }
      this.angle = this.angle % (Math.PI * 2);
      this.verticalAngle = this.verticalAngle % (Math.PI * 2);
      const ang = this.angle - Math.PI;
      const vang = this.verticalAngle;
      const gpulock = engine.rust.get_gpu();
      const cameralock = engine.rust.get_camera(gpulock, this.camera.id);

      this.cameraControl?.updateDirection(
        cameralock,
        Math.cos(ang) * Math.sin(vang),
        Math.cos(vang),
        Math.sin(ang) * Math.sin(vang),
      );
      engine.rust.drop_camera_lock(cameralock);
      engine.rust.drop_gpu_lock(gpulock);
    }
    return true;
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
    engine.addInputListener(this.#keydownfunction);
    engine.addInputListener(this.#keyupfunction);
    engine.addInputListener(this.#pointerMoveFunction);
  }
  updateMouseCoords = () => {
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
  #keydownfunction: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        this.arrowKeysDown |= ARROW_KEYS.UP;
      } else if (e.key === 'ArrowDown') {
        this.arrowKeysDown |= ARROW_KEYS.DOWN;
      }
      if (e.key === 'ArrowLeft') {
        this.arrowKeysDown |= ARROW_KEYS.LEFT;
      } else if (e.key === 'ArrowRight') {
        this.arrowKeysDown |= ARROW_KEYS.RIGHT;
      }
    },
    object: this,
    type: 'keydown',
  };
  #pointerMoveFunction: ListenerObj<'pointermove'> = {
    cb: (e: PointerEvent) => {
      this.pointerMovement = {
        x: e.movementX,
        y: e.movementY,
      };
    },
    object: this,
    options: {
      force: true,
    },
    type: 'pointermove',
  };
  #keyupfunction: ListenerObj<'keyup'> = {
    cb: (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        this.arrowKeysDown &= ~ARROW_KEYS.UP;
        //  this.#mesh.grip=0;
      } else if (e.key === 'ArrowDown') {
        this.arrowKeysDown &= ~ARROW_KEYS.DOWN;
      }
      if (e.key === 'ArrowLeft') {
        this.arrowKeysDown &= ~ARROW_KEYS.LEFT;
      } else if (e.key === 'ArrowRight') {
        this.arrowKeysDown &= ~ARROW_KEYS.RIGHT;
      }
    },
    object: this,
    type: 'keyup',
  };
  lastTranslation = new MutableTerraVector3();
}
