import type { Engine } from '../engine.js';
import { MutableTerraVector3, TerraVector3 } from '../Math.js';
import type { TerraCamera } from '../TerraCamera.js';
import { ARROW_KEYS, CameraController } from './CameraController.js';

declare const engine: Engine;

/**
    This camera is used for camera that can be moved with keyboard
    without being attached to any mesh
*/
export class PositionCamera extends CameraController {
  name = 'PositionCamera';
  #angle = Math.PI;
  #vAngle = Math.PI * 0.5;
  #position = new MutableTerraVector3([-3000, 300, 0]);
  #velocity = 0.5 as const;
  #arrowKeysDown = 0;

  constructor(
    private camera: TerraCamera,
    initial = false,
  ) {
    super();
    const syncCamera = () => {
      this.cameraControl?.updatePosition(
        this.#position[0],
        this.#position[1],
        this.#position[2],
      );
      this.cameraControl?.updateDirection(
        Math.cos(this.#angle),
        0,
        Math.sin(this.#angle),
      );
    };
    if (initial && engine.DB) {
      engine.DB.transaction('save')
        .objectStore('save')
        .get(['camera', 'PositionCamera']).onsuccess = (evt) => {
        if ((evt.target as IDBRequest).result) {
          const restored = (evt.target as IDBRequest).result as {
            data: {
              position: [number, number, number];
              angle: number;
            };
          };
          this.#position.set(restored.data.position);
          this.#angle = restored.data.angle;
          syncCamera();
        }
      };
    } else {
      this.#position.set(this.camera.position as TerraVector3);
      this.#angle = Math.acos(this.camera.direction[0]);
    }
  }
  attachCameraController() {
    document?.addEventListener('keydown', this.#keydownfunction);
    document?.addEventListener('keyup', this.#keyupfunction);
  }
  deAttachCameraController() {
    document?.removeEventListener('keydown', this.#keydownfunction);
    document?.removeEventListener('keyup', this.#keyupfunction);
  }
  #serializeRequested = false;
  #elevation: -1 | 0 | 1 = 0;
  #ctrl = false;
  serialize = () => {
    if (this.#serializeRequested || !engine.DB) return;
    this.#serializeRequested = true;
    const request = engine.DB.transaction('save', 'readwrite')
      .objectStore('save')
      .put({
        data: {
          angle: this.#angle,
          position: this.#position,
        },
        name: 'PositionCamera',
        type: 'camera',
      });
    request.onsuccess = () => {
      this.#serializeRequested = false;
    };
    request.onerror = (e) => {
      this.#serializeRequested = false;
      console.error(e);
    };
  };
  #keydownfunction = (e: KeyboardEvent) => {
    this.#ctrl = e.ctrlKey;
    if (e.key === 'ArrowUp') {
      this.#arrowKeysDown |= ARROW_KEYS.UP;
    } else if (e.key === 'ArrowDown') {
      this.#arrowKeysDown |= ARROW_KEYS.DOWN;
    }
    if (e.key === 'ArrowLeft') {
      this.#arrowKeysDown |= ARROW_KEYS.LEFT;
    } else if (e.key === 'ArrowRight') {
      this.#arrowKeysDown |= ARROW_KEYS.RIGHT;
    }
    if (e.key === 'PageUp') {
      this.#elevation = 1;
    } else if (e.key === 'PageDown') {
      this.#elevation = -1;
    }
  };
  #keyupfunction = (e: KeyboardEvent) => {
    this.#ctrl = e.ctrlKey;
    if (e.key === 'ArrowUp') {
      this.#arrowKeysDown &= ~ARROW_KEYS.UP;
    } else if (e.key === 'ArrowDown') {
      this.#arrowKeysDown &= ~ARROW_KEYS.DOWN;
    }
    if (e.key === 'ArrowLeft') {
      this.#arrowKeysDown &= ~ARROW_KEYS.LEFT;
    } else if (e.key === 'ArrowRight') {
      this.#arrowKeysDown &= ~ARROW_KEYS.RIGHT;
    }
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      this.#elevation = 0;
    }
  };
  checkInputs() {
    if (this.#arrowKeysDown === 0 && this.#elevation === 0) return false;
    if (this.#elevation !== 0) {
      const oldPos = this.camera.position;
      this.cameraControl?.updatePosition(
        oldPos[0],
        oldPos[1] + this.#elevation * this.#velocity,
        oldPos[2],
      );
    }

    if ((this.#arrowKeysDown & ARROW_KEYS.UP_OR_DOWN) > 0) {
      const oldPos = this.camera.position;
      const direction = this.camera.direction;

      if ((this.#arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
        this.cameraControl?.updatePosition(
          oldPos[0] - direction[0] * this.#velocity,
          oldPos[1],
          oldPos[2] - direction[2] * this.#velocity,
        );
      } else {
        this.cameraControl?.updatePosition(
          oldPos[0] + direction[0] * this.#velocity,
          oldPos[1],
          oldPos[2] + direction[2] * this.#velocity,
        );
      }
      this.#position = this.camera.position.clone();
    }

    if (this.#arrowKeysDown) {
      if (this.#ctrl) {
        if ((this.#arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
          this.#angle += 0.03;
          if (this.#angle > Math.PI)
            this.#angle = -Math.PI - (this.#angle % Math.PI);
        }
        if ((this.#arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
          this.#angle -= 0.03;
          if (this.#angle < -Math.PI)
            this.#angle = Math.PI - (this.#angle % Math.PI);
        }
        if ((this.#arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
          this.#vAngle += 0.02;
        }
        if ((this.#arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
          this.#vAngle -= 0.02;
        }
        this.#vAngle = this.#vAngle % (Math.PI * 2);

        this.cameraControl?.updateDirection(
          Math.cos(this.#angle) * Math.sin(this.#vAngle),
          Math.cos(this.#vAngle),
          Math.sin(this.#angle) * Math.sin(this.#vAngle),
        );
      } else if ((this.#arrowKeysDown & ARROW_KEYS.LEFT_OR_RIGHT) > 0) {
        const oldPos = this.camera.position;
        const direction = this.camera.direction;

        if ((this.#arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
          this.cameraControl?.updatePosition(
            oldPos[0] + direction[2] * this.#velocity,
            oldPos[1],
            oldPos[2] - direction[0] * this.#velocity,
          );
        } else {
          this.cameraControl?.updatePosition(
            oldPos[0] - direction[2] * this.#velocity,
            oldPos[1],
            oldPos[2] + direction[0] * this.#velocity,
          );
        }
      }
    }
    return true;
  }
}
