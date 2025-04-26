import type { Engine, ListenerObj } from '../engine.js';
import { MutableTerraVector3, ReadOnlyTerraVector3 } from '../Math.js';
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
    const cameralock = engine.rust.get_camera(
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
    this.id = engine.rust.new_arc_rotate_camera();

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
        const gpulock = engine.rust.get_gpu();
        const cameralock = engine.rust.get_camera(gpulock, this.camera.id);
        const target = new MutableTerraVector3(
          engine.rust.memory.buffer,
          engine.rust.get_target_ptr(this.id),
        );
        if (result) {
          engine.rust.set_alpha(this.id, result.data.alpha);
          engine.rust.set_beta(this.id, result.data.beta);
          engine.rust.set_radius(this.id, result.data.radius);
          target.set(result.data.target);

          this.cameraControl?.updatePosition(
            cameralock,
            result.data.position[0],
            result.data.position[1],
            result.data.position[2],
          );
          this.#calculateDirection(cameralock);
        } else {
          // Use these default values for camera when there are no existing save
          engine.rust.set_alpha(this.id, 0.4614110368395256);
          engine.rust.set_beta(this.id, 1.4816457152012938);
          engine.rust.set_radius(this.id, 457.55058783756886);
          this.cameraControl?.updatePosition(
            cameralock,
            952.791,
            299.464,
            587.233,
          );

          target.set([544.716, 258.727, 384.335]);
        }
        engine.rust.drop_camera_lock(cameralock);
        engine.rust.drop_gpu_lock(gpulock);
      };
    } else {
      const gpulock = engine.rust.get_gpu();
      const cameralock = engine.rust.get_camera(gpulock, this.camera.id);

      const position = new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.get_camera_position_ptr(cameralock),
        3,
      ) as unknown as readonly [number, number, number];
      const direction = new ReadOnlyTerraVector3(
        engine.rust.memory.buffer,
        engine.rust.get_camera_direction_ptr(cameralock),
      );
      const target = new MutableTerraVector3(
        engine.rust.memory.buffer,
        engine.rust.get_target_ptr(this.id),
      );
      target.set([
        position[0] - direction[0] * 100,
        position[1] - direction[1] * 100,
        position[2] - direction[2] * 100,
      ]);

      engine.rust.rebuild_angles_and_radius(
        this.id,
        position[0],
        position[1],
        position[2],
      );
      engine.rust.drop_camera_lock(cameralock);
      engine.rust.drop_gpu_lock(gpulock);
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
  #calculateDirection(cameralock: rust_mutex<'locked', 'camera'>) {
    const position = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.get_camera_position_ptr(cameralock),
      3,
    ) as unknown as readonly [number, number, number];
    const target = new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_target_ptr(this.id),
    );
    const direction = [
      position[0] - target[0],
      position[1] - target[1],
      position[2] - target[2],
    ] as [number, number, number];

    //Normalize direction
    const zLength = Math.hypot(direction[0], direction[1], direction[2]);
    if (!(zLength === 0 || zLength === 1)) {
      //zAxis.normalizeFromLength(xLength);
      const scale = 1.0 / zLength;
      direction[0] *= scale;
      direction[1] *= scale;
      direction[2] *= scale;
    }
    engine.rust.update_camera_direction(cameralock, ...direction);
  }
}
