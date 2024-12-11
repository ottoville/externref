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
  updatePosition(cb: (position: MutableTerraVector3) => void): void;
  updateDirection(cb: (direction: MutableTerraVector3) => void): void;
};
const enum VIEW_UPDATED {
  NONE = 0,
  POSITION = 1,
  DIRECTION = 2,
}
const uniformBufferSize =
  /* modelViewProjectionMatrix + view matrix */ 4 * 16 * 2 /* viewPosition */ +
  4 * 4;
export class TerraCamera {
  #clusterArrayBuffer?: Buffer<BufferUsageEnums.STORAGE>;

  readonly #viewProjectionPositionBuffer = new ArrayBuffer(uniformBufferSize);

  readonly projectionViewArr = new TerraMatrix(
    this.#viewProjectionPositionBuffer,
    0,
  );
  readonly projectionViewInverted: TerraMatrix = new TerraMatrix();
  projectionViewInvertedIsDirty = false;
  readonly viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

  readonly #viewAndProjection = new Float32Array(
    this.#viewProjectionPositionBuffer,
    0,
    32,
  );
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
  set #doUpdateView(value: VIEW_UPDATED) {
    engine.rust.set_do_update_view(this.id, value);
  }
  get #doUpdateView() {
    return engine.rust.get_do_update_view(this.id);
  }
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

    this.viewArr[15] = 1;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    this.controls = {
      updateDirection(cb: (direction: MutableTerraVector3) => void) {
        const direction = new MutableTerraVector3(
          engine.rust.memory.buffer,
          engine.rust.get_camera_direction_ptr(me.id),
        );
        cb(direction);
        if (
          me.viewArr[2] !== direction[0] ||
          me.viewArr[6] !== direction[1] ||
          me.viewArr[10] !== direction[2]
        ) {
          me.#doUpdateView |= VIEW_UPDATED.DIRECTION;
        }
      },
      updatePosition(cb: (position: MutableTerraVector3) => void) {
        const position = new MutableTerraVector3(
          engine.rust.memory.buffer,
          engine.rust.get_camera_position_ptr(me.id),
        );
        cb(position);
        me.#doUpdateView |= VIEW_UPDATED.POSITION;
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
    direction_ptr: rust_pointer<'direction'>,
    position_ptr: rust_pointer<'position'>,
  ) {
    const direction = new MutableTerraVector3(
      engine.rust.memory.buffer,
      direction_ptr,
    );
    const position = new MutableTerraVector3(
      engine.rust.memory.buffer,
      position_ptr,
    );
    //Camera direction
    this.viewArr[2] = direction[0]!;
    this.viewArr[6] = direction[1]!;
    this.viewArr[10] = direction[2]!;

    this.viewArr[0] = this.viewArr[10];
    this.viewArr[8] = -this.viewArr[2];

    const xSquareLength =
      this.viewArr[0] * this.viewArr[0] + this.viewArr[8] * this.viewArr[8];
    if (xSquareLength === 0) {
      this.viewArr[0] = 1.0;
    } else {
      const len = Math.sqrt(xSquareLength);
      if (!(len === 0 || len === 1.0)) {
        const scale = 1.0 / len;
        this.viewArr[0] *= scale;
        this.viewArr[8] *= scale;
      }
    }

    // Y axis
    this.viewArr[1] = this.viewArr[6] * this.viewArr[8];
    this.viewArr[5] =
      this.viewArr[10] * this.viewArr[0] - this.viewArr[2] * this.viewArr[8];
    this.viewArr[9] = -(this.viewArr[6] * this.viewArr[0]);
    // Eye angles, dot products

    //x
    this.viewArr[12] = -(
      this.viewArr[0] * position[0] +
      this.viewArr[8] * position[2]
    );
    //y
    this.viewArr[13] = -(
      this.viewArr[1] * position[0] +
      this.viewArr[5] * position[1] +
      this.viewArr[9] * position[2]
    );
    //z
    this.viewArr[14] = -(
      this.viewArr[2] * position[0] +
      this.viewArr[6] * position[1] +
      this.viewArr[10] * position[2]
    );
    if (this.projection) {
      this.viewArr.multiplyToRef(
        this.projection.projectionReversedZ,
        this.projectionViewArr,
      );
    }
    this.projectionViewInvertedIsDirty = true;
    if (this.gpu) {
      const tempBuffer = engine.rust.create_mapped_GPU_buffer_copysrc(
        this.#viewAndProjection.byteLength,
        ...create_rust_label('camera_tempBuffer'),
      );
      engine.rust.push_to_temp_gpu_buffers(tempBuffer);
      const rawBuffer = engine.rust.get_raw_buffer<
        BufferUsageEnums.COPY_SRC,
        true
      >(tempBuffer).externref;
      new Float32Array(rawBuffer.getMappedRange()).set(this.#viewAndProjection);

      rawBuffer
        .unmap()
        .copyTo(
          commandEncoder,
          this.#uniformBuffer!,
          0,
          0,
          this.#viewAndProjection.byteLength,
        );
    }
  }
}
