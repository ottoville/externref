import type { RenderPass } from "./GPU/RenderPasses/RenderPass.js";

import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { Projection } from "./GPU/Projection.js";
import type { Engine } from "./engine.js";
import type { GPU } from "./GPU.js";
import type { BindGroup } from "./GPU/BindGroup.js";
import { BindStorageBuffer, BindUniformBuffer, Buffer, CopyDstBuffer, GPUBufferUsage } from "./GPU/Buffer/Buffer.js";
import type { BindGroupLayout } from "./GPU/BindGroupLayout.js";
import type { CameraController } from "./controllers/CameraController.js";
declare const engine: Engine;

export type CameraControl = { updatePosition(cb: (position: TerraVector3) => void): void; updateDirection(cb: (direction: TerraVector3) => void): void; }
export class TerraCamera {
    readonly #childCameras: Set<CameraControl> = new Set();

    #clusterArrayBuffer?: BindStorageBuffer/* & CopySrcBuffer*/


    readonly #uniformBufferSize = /* modelViewProjectionMatrix + view matrix */ 4 * 16 * 2 /* viewPosition */ + 4 * 4;
    readonly #direction = new TerraVector3([1, 0, 0])

    readonly #viewProjectionPositionBuffer = new SharedArrayBuffer(this.#uniformBufferSize)

    readonly projectionViewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 0);
    readonly projectionViewInverted: TerraMatrix = new TerraMatrix();
    projectionViewInvertedIsDirty = false;
    readonly viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

    readonly #viewAndProjection = new Float32Array(this.#viewProjectionPositionBuffer, 0, 32);


    readonly #position = new TerraVector3(this.#viewProjectionPositionBuffer, 128);

    #uniformBuffer?: BindUniformBuffer & CopyDstBuffer
    updateViewBindGroup?: BindGroup;
    uniformBindGroup?: BindGroup;
    readonly #controls: CameraControl;
    #doUpdateView = false;
    viewUpdated = false;
    readonly beforeViewUpdate: Set<(position: TerraVector3, direction: TerraVector3) => void> = new Set();
    #cameraController?: TerraCamera
    #inputController?: CameraController
    projection?: Projection
    private gpu?: GPU
    initForGPU(renderPass: RenderPass, gpu: GPU, projection: Projection) {
        renderPass.perspectiveCameras.add(this);
        this.#clusterArrayBuffer?.destroy();
        this.#uniformBuffer?.destroy();
        this.uniformBindGroup?.destroy();
        this.updateViewBindGroup?.destroy();
        this.gpu = gpu;
        this.projection = projection;
        this.#clusterArrayBuffer = Buffer.create(gpu, gpu.clusterSizeinBytes, [GPUBufferUsage.STORAGE, /*GPUBufferUsage.COPY_SRC*/], 'clusterArrayBuffer');
        this.#uniformBuffer = Buffer.create(gpu, this.#uniformBufferSize, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'uniformBuffer'); //Todo: set to private
        this.uniformBindGroup = gpu.uniformBindGroupLayoutWithTime.createBindGroup('uniformBindGroup', (bindGroup) =>
            [{
                binding: 0,
                resource: this.#uniformBuffer!.getUniformBinding(bindGroup)
            }, {
                binding: 1,
                resource: gpu.timeBuffer.getUniformBinding(bindGroup)
            },
            {
                binding: 2,
                resource: this.#clusterArrayBuffer!.getStorageBinding(bindGroup)
            },
            {
                binding: 3,
                resource: gpu.GPUMeshes.getStorageBinding(bindGroup)
            },
            { //TODO: Set to own group because shared by many cameras
                binding: 4,
                resource: projection.gpuBuffer.getUniformBinding(bindGroup)
            }
            ], new Set([renderPass]));
        this.updateViewBindGroup = gpu.updateViewShader.bindLayouts[1].createBindGroup('updateViewBindGroup2',
            (bindGroup) => [
                {
                    binding: 0,
                    resource: this.#clusterArrayBuffer!.getStorageBinding(bindGroup)
                },
                {
                    binding: 1,
                    resource: this.#uniformBuffer!.getUniformBinding(bindGroup),
                }
            ]
        )
        gpu.projections.add(this.projection);
        gpu.cameras.push(this);
    }
    constructor(parent?: TerraCamera) {
        this.viewArr[15] = 1;

        engine.cameras.add(this);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const me = this;
        this.#controls = {
            updatePosition(cb: (position: TerraVector3) => void) {
                cb(me.#position);
                me.#doUpdateView = true;
            },
            updateDirection(cb: (direction: TerraVector3) => void) {
                cb(me.#direction);
                if (me.viewArr[2] !== me.#direction[0] || me.viewArr[6] !== me.#direction[1] || me.viewArr[10] !== me.#direction[2]) {
                    me.#doUpdateView = true;
                }
            }
        }
        if (parent) {
            parent.#childCameras.add(this.getControlForCamera(parent));
        }
    }
    getControlForCamera(owner: TerraCamera) {
        if (this.#cameraController && this.#cameraController !== owner)
            throw new Error('Camera is already controlled');
        else {
            this.#cameraController = owner;
            return this.#controls
        }
    }
    attachControllerForCamera(controller: CameraController) {
        if (this.#inputController) {
            if (this.#inputController !== controller) {
                if (typeof document !== 'undefined')
                    this.#inputController.deAttachCameraController();
                delete this.#inputController.cameraControl
            } else {
                return this.#controls
            }
        }
        this.#inputController = controller;
        engine.inputManager = controller;
        if (typeof document !== 'undefined')
            controller.attachCameraController();
        controller.cameraControl = this.#controls;
        return this.#controls
    }
    get position(): Readonly<{ [0]: number, [1]: number, [2]: number }> {
        return this.#position
    }
    updateClusters(passEncoder: GPUComputePassEncoder, computePipelineClustersLayout: BindGroupLayout) {
        //TODO move out from loop
        const bindGroup = computePipelineClustersLayout.createBindGroup('updateProjection', bindGroup2 => [{
            binding: 0,
            resource: this.#clusterArrayBuffer!.getStorageBinding(bindGroup2)
        },
        {
            binding: 1,
            resource: this.projection!.gpuBuffer.getUniformBinding(bindGroup2)
        }])
        passEncoder.setBindGroup(1, bindGroup.bindGroup);
        passEncoder.dispatchWorkgroups(...this.gpu!.CLUSTER_DISPATCH_SIZE);
    }

    get direction(): Readonly<{ [0]: number, [1]: number, [2]: number }> {
        return this.#direction
    }

    updateView(commandEncoder: GPUCommandEncoder) {
        if (!this.#doUpdateView)
            return;
        this.beforeViewUpdate.forEach(cb => cb(this.#position, this.#direction));
        this.#doUpdateView = false;
        this.viewUpdated = true;
        this.#childCameras.forEach(childCameraControl => {
            childCameraControl.updatePosition(position => {
                position[0] = this.#position[0]
                position[1] = this.#position[1]
                position[2] = this.#position[2]
            })
            //TODO: share same buffer;
            childCameraControl.updateDirection(direction => {
                direction.set(this.#direction)
            })
        });

        //Camera direction
        this.viewArr[2] = this.#direction[0];
        this.viewArr[6] = this.#direction[1];
        this.viewArr[10] = this.#direction[2];

        this.viewArr[0] = this.viewArr[10];
        this.viewArr[8] = -this.viewArr[2];

        const xSquareLength = this.viewArr[0] * this.viewArr[0] + this.viewArr[8] * this.viewArr[8];
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
        this.viewArr[5] = this.viewArr[10] * this.viewArr[0] - this.viewArr[2] * this.viewArr[8];
        this.viewArr[9] = -(this.viewArr[6] * this.viewArr[0]);
        // Eye angles, dot products

        //x
        this.viewArr[12] = -(this.viewArr[0] * this.#position[0] + this.viewArr[8] * this.#position[2])
        //y
        this.viewArr[13] = -(this.viewArr[1] * this.#position[0] + this.viewArr[5] * this.#position[1] + this.viewArr[9] * this.#position[2])
        //z
        this.viewArr[14] = -(this.viewArr[2] * this.#position[0] + this.viewArr[6] * this.#position[1] + this.viewArr[10] * this.#position[2]);
        if (this.projection) {
            this.viewArr.multiplyToRef(this.projection.projectionReversedZ, this.projectionViewArr)
        }
        this.projectionViewInvertedIsDirty = true;
        if (this.gpu) {
            const tempBuffer = Buffer.create(this.gpu, this.#viewAndProjection.byteLength, [GPUBufferUsage.COPY_SRC], 'camera_tempBuffer', b => {
                this.gpu!.tempGPUBuffers.push(b);
                new Float32Array(b.getMappedRange()).set(this.#viewAndProjection);
            });
            tempBuffer.copyTo(commandEncoder, this.#uniformBuffer!, 0, 0, this.#viewAndProjection.byteLength)
        }
    }
}