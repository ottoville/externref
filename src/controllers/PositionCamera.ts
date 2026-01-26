import type { Engine } from '../engine.js';
import type { TerraCamera } from '../TerraCamera.js';
import { CameraController } from './CameraController.js';
import { create_rust_string } from '../utils.js';

declare const engine: Engine;

/**
    This camera is used for camera that can be moved with keyboard
    without being attached to any mesh
*/
export class PositionCamera extends CameraController {
  name = 'PositionCamera';
  #angle = Math.PI;
  #position: readonly [number, number, number] = [-3000, 300, 0];
  id: rust_pointer<'positioncamera'>;

  constructor(
    private camera: TerraCamera,
    initial = false,
  ) {
    super();
    this.id = engine.rust.new_position_camera();

    const syncCamera = () => {
      engine.rust.update_camera_position(
        this.camera.id,
        this.#position[0],
        this.#position[1],
        this.#position[2],
      );
      engine.rust.update_camera_direction(
        this.camera.id,
        Math.cos(this.#angle),
        0,
        Math.sin(this.#angle),
      );
    };
    if (initial && engine.DB) {
      engine.DB.transaction('2')
        .objectStore('2')
        .get(['camera', 'PositionCamera']).onsuccess = (evt) => {
        if ((evt.target as IDBRequest).result) {
          const restored = (evt.target as IDBRequest).result as {
            data: {
              position: [number, number, number];
              angle: number;
            };
          };
          this.#position = [...restored.data.position];
          this.#angle = restored.data.angle;
          syncCamera();
        }
      };
    } else {
      const position = new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.get_camera_position_ptr(this.camera.id),
        3,
      ) as unknown as readonly [number, number, number];

      this.#position = [...position];
      const direction = new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.get_camera_direction_ptr(this.camera.id),
        3,
      );
      this.#angle = Math.acos(direction[0]!);
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
  serialize = () => {
    if (this.#serializeRequested || !engine.DB) return;
    this.#serializeRequested = true;
    const request = engine.DB.transaction('2', 'readwrite')
      .objectStore('2')
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
    engine.rust.keyfunction(
      this.id,
      false,
      e.ctrlKey,
      ...create_rust_string(e.key),
    );
  };
  #keyupfunction = (e: KeyboardEvent) => {
    engine.rust.keyfunction(
      this.id,
      true,
      e.ctrlKey,
      ...create_rust_string(e.key),
    );
  };
}
