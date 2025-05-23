import type { Engine, ListenerObj } from '../engine.js';
import { MutableTerraVector3 } from '../Math.js';
import type { TerraCamera } from '../TerraCamera.js';
import { CameraController } from './CameraController.js';
let pointerDownButton = 0;
declare const engine: Engine;

interface serialized {
  alpha: number;
  beta: number;
  radius: number;
  target: { 0: number; 1: number; 2: number } & Float32Array;
  position: { 0: number; 1: number; 2: number } & Float32Array;
}
export class ArcRotateCamera extends CameraController {
  name = 'ArcRotateCamera';
  #serializeRequested = false;
  id: rust_pointer<'ArcRotateCamera'>;
  serialize(): void {
    if (this.#serializeRequested || !engine.DB) return;
    this.#serializeRequested = true;
    const gpulock = engine.rust.get_gpu();
    const cameralock = engine.rust.get_camera_by_id_mut(
      gpulock,
      engine.gpu!.mainCamera.id,
    );

    const position = new Float32Array(
      new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.get_camera_position_ptr(cameralock),
        3,
      ) as unknown as readonly [number, number, number],
    ) as { 0: number; 1: number; 2: number } & Float32Array;
    engine.rust.drop_camera_lock(cameralock);
    engine.rust.drop_gpu_lock(gpulock);
    const target = new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_target_ptr(this.id),
    );
    const request = engine.DB.transaction('save', 'readwrite')
      .objectStore('save')
      .put({
        data: {
          alpha: engine.rust.get_alpha(this.id),
          beta: engine.rust.get_beta(this.id),
          position,
          radius: engine.rust.get_radius(this.id),
          target,
        } as serialized,
        name: 'ArchRotateCamera',
        type: 'camera',
      });
    request.onsuccess = () => {
      this.#serializeRequested = false;
    };
    request.onerror = (e) => {
      this.#serializeRequested = false;
      console.error(e);
    };
  }

  readonly colliderSphere = engine.rust.create_collider_sphere(2);

  constructor(
    private camera: TerraCamera,
    initial = false,
  ) {
    super();
    this.id = engine.rust.new_arc_rotate_camera(
      initial && engine.DB !== undefined,
      camera.id,
    );

    if (initial && engine.DB) {
      engine.DB.transaction('save')
        .objectStore('save')
        .get(['camera', 'ArchRotateCamera']).onsuccess = (evt) => {
        const result = (
          evt.target as IDBRequest<{
            data: serialized;
            name: string;
            type: string;
          }>
        ).result;

        if (result) {
          engine.rust.restore_arc_rotate_camera(
            this.id,
            result.data.alpha,
            result.data.beta,
            result.data.radius,
            result.data.target[0],
            result.data.target[1],
            result.data.target[2],
            result.data.position[0],
            result.data.position[1],
            result.data.position[2],
            this.camera.id,
          );
        } else {
          // Use these default values for camera when there are no existing save
          engine.rust.restore_arc_rotate_camera(
            this.id,
            0.4614110368395256,
            1.4816457152012938,
            457.55058783756886,
            544.716,
            258.727,
            384.335,
            952.791,
            299.464,
            587.233,
            this.camera.id,
          );
        }
      };
    }
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
        engine.gpu?.renderPassScreen
          .pickPosition()
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
    engine.addInputListener({
      cb: (e) => {
        if (this.camera.gpu) {
          const gpu = this.camera.gpu;
          Atomics.store(gpu.mousePosition, 0, e.clientX * gpu.scale.x);
          Atomics.store(gpu.mousePosition, 1, e.clientY * gpu.scale.y);
          Atomics.notify(new Int32Array(gpu.mousePositionBuffer), 0);
        }
      },
      object: this,
      options: {
        force: true,
      },
      type: 'pointermove',
    } as ListenerObj<'pointermove'>);
  }
}
