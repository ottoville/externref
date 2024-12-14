import {
  MutableTerraVector3,
  ReadOnlyTerraVector3,
  TerraMatrix,
} from './Math.js';
import { Projection } from './GPU/Projection.js';
import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';
import type { CameraController } from './controllers/CameraController.js';
import { ClustersComp } from './GPU/Shaders/Clusters.comp.js';
import { BindGroup, Buffer, BufferUsageEnums } from './webgpu-ts/index.js';
import { create_rust_label, stringFromPtr } from './utils.js';
declare const engine: Engine;

export type CameraControl = {
  updatePosition(x: number, y: number, z: number): void;
  updateDirection(x: number, y: number, z: number): void;
};

const uniformBufferSize =
  /* modelViewProjectionMatrix + view matrix */ 4 * 16 * 2 /* viewPosition */ +
  4 * 4;
export class TerraCamera {
  #clusterArrayBuffer?: Buffer<BufferUsageEnums.STORAGE>;

  get projectionViewArr() {
    return new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.get_camera_projection_ptr(this.id),
    );
  }
  readonly projectionViewInverted: TerraMatrix = new TerraMatrix();
  projectionViewInvertedIsDirty = false;
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
  #uniformBuffer?: Buffer<(typeof BufferUsageEnums)['UNIFORM|COPY_DST']>;
  updateViewBindGroup?: BindGroup;
  uniformBindGroup?: BindGroup;
  readonly controls: CameraControl;
  #cameraController?: TerraCamera;
  #inputController?: CameraController;
  projection?: Projection;
  public gpu?: GPU;

  onUpdatePosition: Set<() => void> = new Set();
  id: number;
  get label(): string {
    return stringFromPtr(
      engine.rust.memory,
      engine.rust.get_camera_label(this.id),
    );
  }
  constructor(
    label: string,
    renderPassName: 'renderPassScreen' | 'renderPassWater',
    parent?: TerraCamera,
  ) {
    if (parent) {
      if (label === 'waterCamera') {
        this.id = engine.rust.add_child_to_camera_water(
          parent.id,
          this,
          ...create_rust_label(label),
        );
      } else {
        this.id = engine.rust.add_child_to_camera(
          parent.id,
          this,
          ...create_rust_label(label),
        );
      }
    } else {
      this.id = engine.rust.add_camera(this, ...create_rust_label(label));
    }
    engine.getGPU((gpu) => {
      const projection = parent?.projection ?? new Projection(gpu);
      const renderPass = gpu[renderPassName];
      renderPass.perspectiveCameras.add(this);
      this.#clusterArrayBuffer?.destroy();
      this.#uniformBuffer?.destroy();
      this.uniformBindGroup?.destroy();
      this.updateViewBindGroup?.destroy();
      this.gpu = gpu;
      this.projection = projection;

      this.#clusterArrayBuffer = new Buffer({
        gpu: gpu.device,
        label: 'clusterArrayBuffer',
        size: gpu.clusterSizeinBytes,
        usages: BufferUsageEnums.STORAGE,
      });

      this.#uniformBuffer = new Buffer({
        gpu: gpu.device,
        label: 'uniformBuffer',
        size: uniformBufferSize,
        usages: BufferUsageEnums['UNIFORM|COPY_DST'],
      }); //Todo: set to private
      this.uniformBindGroup = new BindGroup(
        gpu.pipelineLayouts.uniformBindGroupLayoutWithTime,
        'uniformBindGroup',
        (bindGroup) => ({
          clusters_array:
            this.#clusterArrayBuffer!.getStorageBinding(bindGroup),
          meshes: engine.rust
            .get_gpu_mesh_buffer()
            .externref.getStorageBinding(bindGroup),
          //TODO: Set to own group because shared by many cameras
          projection: projection.gpuBuffer.getUniformBinding(bindGroup),
          scene: this.#uniformBuffer!.getUniformBinding(bindGroup),
          time: gpu.timeBuffer.getUniformBinding(bindGroup),
        }),
      );
      this.updateViewBindGroup = new BindGroup(
        gpu.updateViewShader[0][1],
        'updateViewBindGroup2',
        (bindGroup) => ({
          clusters: this.#clusterArrayBuffer!.getStorageBinding(bindGroup),
          viewUniforms: this.#uniformBuffer!.getUniformBinding(bindGroup),
        }),
      );
      gpu.projections.add(this.projection);
      gpu.cameras.push(this);
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
  updateClusters(
    passEncoder: GPUComputePassEncoder,
    computePipelineClustersLayout: ClustersComp['0']['1'],
  ) {
    //TODO move out from loop
    const bindGroup = new BindGroup(
      computePipelineClustersLayout,
      'updateProjection',
      (bindGroup2) => ({
        clusters: this.#clusterArrayBuffer!.getStorageBinding(bindGroup2),
        screentoview: this.projection!.gpuBuffer.getUniformBinding(bindGroup2),
      }),
    );
    passEncoder.setBindGroup(1, bindGroup.bindGroup);
    passEncoder.dispatchWorkgroups(...this.gpu!.CLUSTER_DISPATCH_SIZE);
  }

  get direction() {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.get_camera_direction_ptr(this.id),
    );
  }
  /**
   * Update camera view
   * @param commandEncoder GPUCommandEncoder
   * @returns boolean indicating if view was actually changed
   */
  updateView(
    commandEncoder: GPUCommandEncoder,
    view_ptr: rust_pointer<'matrix'>,
    projection_ptr: rust_pointer<'matrix'>,
  ) {
    const viewArr = new TerraMatrix(engine.rust.memory.buffer, view_ptr);
    const projectionViewArr = new TerraMatrix(
      engine.rust.memory.buffer,
      projection_ptr,
    );
    const viewAndProjection = new Float32Array(
      engine.rust.memory.buffer,
      projection_ptr,
      32,
    );
    if (this.projection) {
      viewArr.multiplyToRef(
        this.projection.projectionReversedZ,
        projectionViewArr,
      );
    }
    this.projectionViewInvertedIsDirty = true;
    if (this.gpu) {
      const tempBuffer = engine.rust.create_mapped_GPU_buffer_copysrc(
        viewAndProjection.byteLength,
        ...create_rust_label('camera_tempBuffer'),
      );
      engine.rust.push_to_temp_gpu_buffers(tempBuffer);
      const rawBuffer = engine.rust.get_raw_buffer<
        BufferUsageEnums.COPY_SRC,
        true
      >(tempBuffer).externref;
      new Float32Array(rawBuffer.getMappedRange()).set(viewAndProjection);

      rawBuffer
        .unmap()
        .copyTo(
          commandEncoder,
          this.#uniformBuffer!,
          0,
          0,
          viewAndProjection.byteLength,
        );
    }
  }
}
