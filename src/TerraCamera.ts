import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';
import type { CameraController } from './controllers/CameraController.js';
import { create_rust_label, create_rust_vec_ptr } from './utils.js';
import { RenderPass } from 'GPU/RenderPasses/RenderPass.js';
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
import { MeshCamera } from './controllers/MeshCamera.js';
import { PositionCamera } from './controllers/PositionCamera.js';
declare const engine: Engine;
export class TerraCamera {
  update_camera_projection_view_inverted() {
    engine.rust.update_camera_projection_view_inverted(this.id, this.gpu!.gpu);
  }
  #inputController?: CameraController;
  public gpu?: GPU;

  onUpdatePosition: Set<(x: number, y: number, z: number) => void> = new Set();
  id: number;
  constructor(
    label: string,
    renderPasses: RenderPass[],
    gpu: rust_pointer<'GPU'>,
    parent?: TerraCamera,
  ) {
    renderPasses.forEach((renderPass) => {
      renderPass.perspectiveCameras.push(this);
    });
    const [ptr, len, cap] = create_rust_vec_ptr(
      engine.rust.alloc_vector_usize(renderPasses.length),
    );
    new Uint32Array(engine.rust.memory.buffer, ptr, len).set(
      renderPasses.map((renderpass) => renderpass.props.id),
    );
    if (parent) {
      if (label === 'waterCamera') {
        this.id = engine.rust.add_child_to_camera_water(
          parent.id,
          this,
          ...create_rust_label(label),
          ptr,
          len,
          cap,
          gpu,
        );
      } else {
        this.id = engine.rust.add_child_to_camera(
          parent.id,
          this,
          ...create_rust_label(label),
          ptr,
          len,
          cap,
          gpu,
        );
      }
    } else {
      this.id = engine.rust.add_camera(
        this,
        ...create_rust_label(label),
        ptr,
        len,
        cap,
        gpu,
      );
    }
    engine.getGPU((gpu2) => {
      this.gpu = gpu2;
    });
  }
  attachControllerForCamera(
    controller: CameraController,
    gpu: rust_pointer<'GPU'>,
  ) {
    const cameralock = engine.rust.get_camera_by_id_mut(gpu, this.id);

    if (controller instanceof ArcRotateCamera) {
      engine.rust.attach_archrotate_camera_controller(
        cameralock,
        controller.id,
      );
    } else if (controller instanceof MeshCamera) {
      engine.rust.attach_meshcamera_camera_controller(
        cameralock,
        controller.id,
      );
    } else if (controller instanceof PositionCamera) {
      engine.rust.attach_positioncamera_camera_controller(
        cameralock,
        controller.id,
      );
    }
    engine.rust.drop_camera_lock(cameralock);

    if (this.#inputController) {
      if (this.#inputController !== controller) {
        if (typeof document !== 'undefined')
          this.#inputController.deAttachCameraController();
        delete this.#inputController.cameraControl;
      }
    }
    this.#inputController = controller;
    engine.inputManager = controller;
    if (typeof document !== 'undefined') controller.attachCameraController();
    controller.cameraControl = this;
  }
}
