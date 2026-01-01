import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';
import type { CameraController } from './controllers/CameraController.js';
import { RenderPass } from 'GPU/RenderPasses/RenderPass.js';
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
import { MeshCamera } from './controllers/MeshCamera.js';
import { PositionCamera } from './controllers/PositionCamera.js';
declare const engine: Engine;
export class TerraCamera {
  #inputController?: CameraController;
  public gpu?: GPU;

  onUpdatePosition: Set<(x: number, y: number, z: number) => void> = new Set();
  id: rust_pointer<'camera'>;
  constructor(renderPasses: RenderPass[], id: rust_pointer<'camera'>) {
    renderPasses.forEach((renderPass) => {
      renderPass.perspectiveCameras.push(this);
    });
    this.id = id;
    engine.getGPU((gpu2) => {
      this.gpu = gpu2;
    });
  }
  attachControllerForCamera(controller: CameraController) {
    if (controller instanceof ArcRotateCamera) {
      engine.rust.attach_archrotate_camera_controller(this.id, controller.id);
    } else if (controller instanceof MeshCamera) {
      engine.rust.attach_meshcamera_camera_controller(this.id, controller.id);
    } else if (controller instanceof PositionCamera) {
      engine.rust.attach_positioncamera_camera_controller(
        this.id,
        controller.id,
      );
    }

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
