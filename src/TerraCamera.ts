import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';
import type { CameraController } from './controllers/CameraController.js';
import { create_rust_label } from './utils.js';
import { RenderPass } from 'GPU/RenderPasses/RenderPass.js';
import { Externref } from './externref.js';
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
import { MeshCamera } from './controllers/MeshCamera.js';
import { PositionCamera } from './controllers/PositionCamera.js';
declare const engine: Engine;
export class TerraCamera {
  update_camera_projection_view_inverted() {
    engine.rust.update_camera_projection_view_inverted(this.id);
  }
  #inputController?: CameraController;
  public gpu?: GPU;

  onUpdatePosition: Set<(x: number, y: number, z: number) => void> = new Set();
  id: number;
  constructor(
    label: string,
    gpu: GPU,
    renderPasses: RenderPass[],
    parent?: TerraCamera,
  ) {
    renderPasses.forEach((renderPass) => {
      renderPass.perspectiveCameras.push(this);
    });

    if (parent) {
      if (label === 'waterCamera') {
        this.id = engine.rust.add_child_to_camera_water(
          parent.id,
          new Externref(true, gpu.device),
          gpu.pipelineLayouts.updateClustersLayout,
          gpu.pipelineLayouts.uniformBindGroupLayoutWithTime,
          this,
          ...create_rust_label(label),
          gpu.pipelineLayouts.clustersLayout,
        );
      } else {
        this.id = engine.rust.add_child_to_camera(
          parent.id,
          new Externref(true, gpu.device),
          gpu.pipelineLayouts.updateClustersLayout,
          gpu.pipelineLayouts.uniformBindGroupLayoutWithTime,
          this,
          ...create_rust_label(label),
          gpu.pipelineLayouts.clustersLayout,
        );
      }
    } else {
      this.id = engine.rust.add_camera(
        new Externref(true, gpu.device),
        gpu.pipelineLayouts.updateClustersLayout,
        gpu.pipelineLayouts.uniformBindGroupLayoutWithTime,
        this,
        ...create_rust_label(label),
        gpu.pipelineLayouts.clustersLayout,
      );
    }
    engine.getGPU((gpu2) => {
      this.gpu = gpu2;
    });
  }
  attachControllerForCamera(controller: CameraController) {
    const gpu = engine.rust.get_gpu();
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
    engine.rust.drop_gpu_lock(gpu);

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
