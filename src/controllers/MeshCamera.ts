import { MutableTerraVector3 } from '../Math.js';
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
    this.angle = Math.acos(this.camera.direction[0]);
  }
  calculateCameraPositionAndTarget() {
    // TODO
  }
  checkInputs() {
    //TODO
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
