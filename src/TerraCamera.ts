import {
  MutableTerraVector3,
  ReadOnlyTerraVector3,
  TerraMatrix,
} from './Math.js';
import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';
import type { CameraController } from './controllers/CameraController.js';
import { BindGroup, Buffer, BufferUsageEnums } from './webgpu-ts/index.js';
import { create_rust_label, stringFromPtr } from './utils.js';
import { RenderPass } from 'GPU/RenderPasses/RenderPass.js';
import { Externref } from './externref.js';
declare const engine: Engine;

export type CameraControl = {
  updatePosition(x: number, y: number, z: number): void;
  updateDirection(x: number, y: number, z: number): void;
};

export class TerraCamera {
  updateClustersBindGroup?: BindGroup<GPU['pipelineLayouts']['clustersLayout']>;

  get projectionViewInverted() {
    return new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.get_camera_projection_inverted_ptr(this.id),
    );
  }
  update_camera_projection_view_inverted() {
    engine.rust.update_camera_projection_view_inverted(this.id);
  }
  get viewArr() {
    return new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.get_camera_view_ptr(this.id),
    );
  }
  get position() {
    return new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_camera_position_ptr(this.id),
    );
  }
  uniformBindGroup?: BindGroup;
  readonly controls: CameraControl;
  #cameraController?: TerraCamera;
  #inputController?: CameraController;
  public gpu?: GPU;

  onUpdatePosition: Set<(x: number, y: number, z: number) => void> = new Set();
  id: number;
  get label(): string {
    return stringFromPtr(
      engine.rust.memory,
      engine.rust.get_camera_label(this.id),
    );
  }
  constructor(
    label: string,
    gpu: GPU,
    renderPass: RenderPass,
    parent?: TerraCamera,
  ) {
    renderPass.perspectiveCameras.push(this);
    if (parent) {
      if (label === 'waterCamera') {
        this.id = engine.rust.add_child_to_camera_water(
          parent.id,
          new Externref(true, gpu.device),
          gpu.pipelineLayouts.updateClustersLayout,
          this,
          ...create_rust_label(label),
        );
      } else {
        this.id = engine.rust.add_child_to_camera(
          parent.id,
          new Externref(true, gpu.device),
          gpu.pipelineLayouts.updateClustersLayout,
          this,
          ...create_rust_label(label),
        );
      }
    } else {
      this.id = engine.rust.add_camera(
        new Externref(true, gpu.device),
        gpu.pipelineLayouts.updateClustersLayout,
        this,
        ...create_rust_label(label),
      );
    }
    engine.getGPU((gpu2) => {
      this.uniformBindGroup?.destroy();
      this.gpu = gpu2;
      this.updateClustersBindGroup = new BindGroup(
        gpu2.pipelineLayouts.clustersLayout,
        'updateProjection',
        (bindGroup2) => {
          const gpu_lock = engine.rust.get_gpu();
          const projection_buffer =
            engine.rust.get_gpu_projection_buffer_from_mutex(
              gpu_lock,
            ).externref;
          const cluster_buffer_index =
            engine.rust.get_camera_cluster_buffer_from_mutex(gpu_lock, this.id);

          engine.rust.drop_gpu_lock(gpu_lock);

          const group = {
            clusters: (
              engine.rust.externrefs.get(cluster_buffer_index) as Externref<
                false,
                Buffer<(typeof BufferUsageEnums)['STORAGE']>
              >
            ).externref.getStorageBinding(bindGroup2),
            screentoview: projection_buffer.getUniformBinding(bindGroup2),
          };
          return group;
        },
      );
      //Todo: set to private
      this.uniformBindGroup = new BindGroup(
        gpu2.pipelineLayouts.uniformBindGroupLayoutWithTime,
        'uniformBindGroup',
        (bindGroup) => {
          const projectionBuffer = engine.rust
            .get_gpu_projection_buffer(gpu2.gpu_lock!)
            .externref.getUniformBinding(bindGroup);

          const cluster_buffer_index = engine.rust.get_camera_cluster_buffer(
            gpu2.gpu_lock!,
            this.id,
          );
          const index = engine.rust.get_gpu_mesh_buffer(gpu2.gpu_lock!);
          const buffer = engine.rust.externrefs.get(index) as Externref<
            false,
            Buffer<
              (typeof BufferUsageEnums)['UNIFORM|STORAGE|COPY_SRC|COPY_DST']
            >
          >;
          const camera_buffer_index = engine.rust.get_camera_buffer(
            gpu2.gpu_lock!,
            this.id,
          );

          const group = {
            clusters_array: (
              engine.rust.externrefs.get(cluster_buffer_index) as Externref<
                false,
                Buffer<(typeof BufferUsageEnums)['STORAGE']>
              >
            ).externref.getStorageBinding(bindGroup),
            meshes: buffer.externref.getStorageBinding(bindGroup),
            projection: projectionBuffer,
            scene: (
              engine.rust.externrefs.get(camera_buffer_index) as Externref<
                false,
                Buffer<(typeof BufferUsageEnums)['UNIFORM|COPY_DST']>
              >
            ).externref.getUniformBinding(bindGroup),
            time: gpu.timeBuffer.getUniformBinding(bindGroup),
          };
          return group;
        },
      );
      gpu2.cameras.push(this);
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    this.controls = {
      updateDirection(x: number, y: number, z: number) {
        engine.rust.update_camera_direction(me.id, x, y, z);
      },
      updatePosition(x: number, y: number, z: number) {
        engine.rust.update_camera_position(me.id, x, y, z);
      },
    };
  }
  getControlForCamera(owner: TerraCamera) {
    if (this.#cameraController && this.#cameraController !== owner)
      throw new Error('Camera is already controlled');
    else {
      this.#cameraController = owner;
      return this.controls;
    }
  }
  attachControllerForCamera(controller: CameraController) {
    if (this.#inputController) {
      if (this.#inputController !== controller) {
        if (typeof document !== 'undefined')
          this.#inputController.deAttachCameraController();
        delete this.#inputController.cameraControl;
      } else {
        return this.controls;
      }
    }
    this.#inputController = controller;
    engine.inputManager = controller;
    if (typeof document !== 'undefined') controller.attachCameraController();
    controller.cameraControl = this.controls;
    return this.controls;
  }
  get direction() {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_camera_direction_ptr(this.id),
    );
  }
}
