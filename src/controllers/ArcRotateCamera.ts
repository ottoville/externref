import type { Engine, ListenerObj } from '../engine.js';
import type { TerraCamera } from '../TerraCamera.js';
import { CameraController } from './CameraController.js';
let pointerDownButton = 0;
declare const engine: Engine;

export class ArcRotateCamera extends CameraController {
  name = 'ArcRotateCamera';
  id: rust_pointer<'ArcRotateCamera'>;
  serialize(): void {
    engine.rust.serialize_arcrotatecamera(this.id);
  }

  readonly colliderSphere = engine.rust.create_collider_sphere(2);

  constructor(camera: TerraCamera, initial = false) {
    super();
    this.id = engine.rust.new_arc_rotate_camera(initial, camera.id);
  }
  #cameraMove: ListenerObj<'pointermove'> = {
    cb: (e) => {
      e.preventDefault();
      engine.rust.camera_move(
        this.id,
        pointerDownButton,
        e.movementX,
        e.movementY,
      );
    },
    object: this,
    type: 'pointermove',
  };
  #cameraWheel: ListenerObj<'wheel'> = {
    cb: (e) => {
      e.preventDefault();
      engine.rust.camera_wheel(this.id, e.deltaY, e.ctrlKey);
    },
    object: this,
    type: 'wheel',
  };
  moveto(destination: readonly [number, number, number]) {
    engine.rust.set_movement(this.id, true, ...destination);
  }
  pointerDown = false;
  #cameraPointerDown: ListenerObj<'pointerdown'> = {
    cb: (e: PointerEvent) => {
      this.pointerDown = true;
      pointerDownButton = e.button;
      if (pointerDownButton !== 2) {
        const pickPosition = engine.gpu?.renderPassScreen.pickPosition();
        if (pickPosition) {
          pickPosition
            .then((position) => {
              if (position) {
                engine.rust.set_movement(
                  this.id,
                  false,
                  position.position[0],
                  position.position[1],
                  position.position[2],
                );
              }
            })
            .catch((err) => engine.showError(err));
        }
      }
      engine.addInputListener(this.#cameraMove);
      const onceUp: ListenerObj<'pointerup'> = {
        cb: () => {
          engine.removeInputListener(this.#cameraMove);
          engine.removeInputListener(onceLeave);
          this.pointerDown = false;
        },
        object: this,
        options: {
          once: true,
        },
        type: 'pointerup',
      };
      const onceLeave: ListenerObj<'pointerleave'> = {
        cb: () => {
          engine.removeInputListener(this.#cameraMove);
          engine.removeInputListener(onceUp);
          this.pointerDown = false;
        },
        object: this,
        options: {
          once: true,
        },
        type: 'pointerleave',
      };
      engine.addInputListener(onceLeave);
      engine.addInputListener(onceUp);
    },
    object: this,
    type: 'pointerdown',
  };
  deAttachCameraController() {
    engine.clearInputListeners(this);
    this.serialize();
  }
  attachCameraController() {
    engine.addInputListener(this.#cameraWheel);
    engine.addInputListener(this.#cameraPointerDown);
  }
}
