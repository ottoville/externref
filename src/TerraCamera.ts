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
  readonly #childCameras: Set<CameraControl> = new Set();

  #clusterArrayBuffer?: Buffer<BufferUsageEnums.STORAGE>;

  readonly #direction = new MutableTerraVector3([1, 0, 0]);

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

  readonly position = new ReadOnlyTerraVector3(
    this.#viewProjectionPositionBuffer,
    128,
  );
  readonly #positionMutable = new MutableTerraVector3(
    this.#viewProjectionPositionBuffer,
    128,
  );

  #uniformBuffer?: Buffer<(typeof BufferUsageEnums)['UNIFORM|COPY_DST']>;
  updateViewBindGroup?: BindGroup;
  uniformBindGroup?: BindGroup;
  readonly #controls: CameraControl;
  #doUpdateView = VIEW_UPDATED.NONE;
  readonly beforeViewUpdate: Set<
    (
      position: MutableTerraVector3,
      direction: MutableTerraVector3,
      commandEncoder: GPUCommandEncoder,
    ) => void
  > = new Set();
  #cameraController?: TerraCamera;
  #inputController?: CameraController;
  projection?: Projection;
  public gpu?: GPU;

  onUpdatePosition: Set<() => void> = new Set();
  constructor(
    public label: string,
    renderPassName: 'renderPassScreen' | 'renderPassWater',
    parent?: TerraCamera,
  ) {
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
        gpu.shaders.uniformBindGroupLayoutWithTime,
        'uniformBindGroup',
        (bindGroup) => ({
          clusters_array:
            this.#clusterArrayBuffer!.getStorageBinding(bindGroup),
          meshes: gpu.GPUMeshes.getStorageBinding(bindGroup),
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

    engine.cameras.push(this);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const me = this;
    this.#controls = {
      updateDirection(cb: (direction: MutableTerraVector3) => void) {
        cb(me.#direction);
        if (
          me.viewArr[2] !== me.#direction[0] ||
          me.viewArr[6] !== me.#direction[1] ||
          me.viewArr[10] !== me.#direction[2]
        ) {
          me.#doUpdateView |= VIEW_UPDATED.DIRECTION;
        }
      },
      updatePosition(cb: (position: MutableTerraVector3) => void) {
        cb(me.#positionMutable);
        me.#doUpdateView |= VIEW_UPDATED.POSITION;
      },
    };
    if (parent) {
      parent.#childCameras.add(this.getControlForCamera(parent));
    }
  }
  getControlForCamera(owner: TerraCamera) {
    if (this.#cameraController && this.#cameraController !== owner)
      throw new Error('Camera is already controlled');
    else {
      this.#cameraController = owner;
      return this.#controls;
    }
  }
  attachControllerForCamera(controller: CameraController) {
    if (this.#inputController) {
      if (this.#inputController !== controller) {
        if (typeof document !== 'undefined')
          this.#inputController.deAttachCameraController();
        delete this.#inputController.cameraControl;
      } else {
        return this.#controls;
      }
    }
    this.#inputController = controller;
    engine.inputManager = controller;
    if (typeof document !== 'undefined') controller.attachCameraController();
    controller.cameraControl = this.#controls;
    return this.#controls;
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

  get direction(): Readonly<{ [0]: number; [1]: number; [2]: number }> {
    return this.#direction;
  }
  /**
   * Update camera view
   * @param commandEncoder GPUCommandEncoder
   * @returns boolean indicating if view was actually changed
   */
  updateView(commandEncoder: GPUCommandEncoder): boolean {
    if (!this.#doUpdateView) return false;
    if (this.beforeViewUpdate.size > 0) {
      this.#doUpdateView |= VIEW_UPDATED.POSITION & VIEW_UPDATED.DIRECTION;
      this.beforeViewUpdate.forEach((cb) =>
        cb(this.#positionMutable, this.#direction, commandEncoder),
      );
    }
    if (
      (this.#doUpdateView & VIEW_UPDATED.POSITION) ===
      VIEW_UPDATED.POSITION
    ) {
      this.onUpdatePosition.forEach((cb) => cb());
    }
    this.#childCameras.forEach((childCameraControl) => {
      if (
        (this.#doUpdateView & VIEW_UPDATED.POSITION) ===
        VIEW_UPDATED.POSITION
      ) {
        childCameraControl.updatePosition((position) => {
          position[0] = this.position[0];
          position[1] = this.position[1];
          position[2] = this.position[2];
        });
      }
      if (
        (this.#doUpdateView & VIEW_UPDATED.DIRECTION) ===
        VIEW_UPDATED.DIRECTION
      ) {
        //TODO: share same buffer;
        childCameraControl.updateDirection((direction) => {
          direction.set(this.#direction);
        });
      }
    });
    this.#doUpdateView = VIEW_UPDATED.NONE;

    //Camera direction
    this.viewArr[2] = this.#direction[0];
    this.viewArr[6] = this.#direction[1];
    this.viewArr[10] = this.#direction[2];

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
      this.viewArr[0] * this.position[0] +
      this.viewArr[8] * this.position[2]
    );
    //y
    this.viewArr[13] = -(
      this.viewArr[1] * this.position[0] +
      this.viewArr[5] * this.position[1] +
      this.viewArr[9] * this.position[2]
    );
    //z
    this.viewArr[14] = -(
      this.viewArr[2] * this.position[0] +
      this.viewArr[6] * this.position[1] +
      this.viewArr[10] * this.position[2]
    );
    if (this.projection) {
      this.viewArr.multiplyToRef(
        this.projection.projectionReversedZ,
        this.projectionViewArr,
      );
    }
    this.projectionViewInvertedIsDirty = true;
    if (this.gpu) {
      const tempBuffer = new Buffer(
        {
          gpu: this.gpu.device,
          label: 'camera_tempBuffer',
          size: this.#viewAndProjection.byteLength,
          usages: BufferUsageEnums.COPY_SRC,
        },
        (b) => {
          engine.rust.push_to_temp_gpu_buffers({
            externref: b,
            reference: false,
          });
          new Float32Array(b.getMappedRange()).set(this.#viewAndProjection);
        },
      );
      tempBuffer.copyTo(
        commandEncoder,
        this.#uniformBuffer!,
        0,
        0,
        this.#viewAndProjection.byteLength,
      );
    }
    return true;
  }
}
