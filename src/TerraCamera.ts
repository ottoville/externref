import type { RenderPass } from "./GPU/RenderPass.js";

import type { GPU } from "./GPU.js";
import { GPUBufferUsage } from "./GPU.js";
import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { Projection } from "./GPU/Projection.js";
import type { Engine } from "./engine.js";
declare const engine:Engine;

export class TerraCamera<T extends RenderPass = RenderPass> {
    readonly #childCameras: Set<TerraCamera> = new Set();

    readonly #clusterArrayBuffer: GPUStorageBuffer

    readonly #uniformBufferSize = /* modelViewProjectionMatrix + view matrix */ 4 * 16 * 2 /* viewPosition */ + 4 * 4;
    readonly #direction = new TerraVector3([1, 0, 0])

    readonly #viewProjectionPositionBuffer = new SharedArrayBuffer(this.#uniformBufferSize)

    readonly projectionViewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 0);
    readonly projectionViewInverted: TerraMatrix = new TerraMatrix();
    projectionViewInvertedIsDirty = false;
    readonly viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

    readonly #viewAndProjection = new Float32Array(this.#viewProjectionPositionBuffer, 0, 32);


    readonly #position = new TerraVector3(this.#viewProjectionPositionBuffer, 128);

    readonly #uniformBuffer: GPUUniformBuffer & GPUCopyDSTBuffer; //Todo: set to private
    readonly updateViewBindGroup: GPUBindGroup;
    readonly uniformBindGroup: () => GPUBindGroup;

    constructor(public renderPass: T, public projection: Projection, private gpu: GPU, parent?: TerraCamera) {
        this.#clusterArrayBuffer = gpu.createGPUBuffer(gpu.clusterSizeinBytes, [GPUBufferUsage.STORAGE]);
        this.#uniformBuffer = gpu.createGPUBuffer(this.#uniformBufferSize, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
        this.uniformBindGroup = () => gpu.uniformBindGroupLayoutWithTime.createBindGroup('uniformBindGroup',
            [{
                binding: 0,
                resource: {
                    buffer: this.#uniformBuffer
                }
            }, gpu.timeGroup,
            {
                binding: 2,
                resource: {
                    buffer: this.#clusterArrayBuffer
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: this.gpu.GPUMeshes
                }
            },
            { //TODO: Set to own group because shared by many cameras
                binding: 4,
                resource: {
                    buffer: this.projection.gpuBuffer
                }
            }
        ]);
        this.updateViewBindGroup = this.gpu.updateViewPipeline.createBindGroup(this.gpu.viewUniformsLayout,
            [
                {
                    binding: 0,
                    resource: {
                        buffer: this.#clusterArrayBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.#uniformBuffer,
                    },
                }
            ]
        )

        this.viewArr[15] = 1;
        if (parent)
            parent.#childCameras.add(this);
        renderPass.cameras.add(this);
        gpu.projections.add(this.projection);
        engine.cameras.add(this);
    }
    get position(): Readonly<{ [0]: number, [1]: number, [2]: number } > {
        return this.#position
    }
    set position(position: [number, number, number] | { [0]: number, [1]: number, [2]: number }) {
        this.#position[0] = position[0];
        this.#position[1] = position[1];
        this.#position[2] = position[2];
        this.#doUpdateView=true;
    }

    updateProjection(passEncoder: GPUComputePassEncoder, computePipelineClustersLayout: GPUBindGroupLayout) {
        //TODO move out from loop
        const bindGroup = this.gpu.device.createBindGroup({
            layout: computePipelineClustersLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.#clusterArrayBuffer,
                    label: 'clusterArrayBuffer'
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.projection.gpuBuffer,
                    label: 'gpuBuffer'
                }
            }]
        });
        passEncoder.setBindGroup(1, bindGroup);
        passEncoder.dispatch(...this.gpu.CLUSTER_DISPATCH_SIZE);
    }
    #doUpdateView = false;
    viewUpdated = false;

    get direction(): Readonly<{ [0]: number, [1]: number, [2]: number }> {
        return this.#direction
    }
    updateDirection(cb:(direction:TerraVector3) => void) {
        cb(this.#direction);
        if (this.viewArr[2] !== this.#direction[0] || this.viewArr[6] !== this.#direction[1] || this.viewArr[10] !== this.#direction[2]) {
            this.#doUpdateView = true;
        }
    }
    updateView(commandEncoder: GPUCommandEncoder) {

        if (!this.#doUpdateView)
            return;
        this.beforeViewUpdate.forEach(cb => cb(this.#position, this.#direction));
        this.#doUpdateView = false;
        this.viewUpdated = true;
        this.#childCameras.forEach(childCamera => {
            childCamera.position = this.#position;
            //TODO: share same buffer;
            childCamera.updateDirection(direction => {
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
        this.viewArr.multiplyToRef(this.projection.projectionReversedZ, this.projectionViewArr)
        this.projectionViewInvertedIsDirty = true;
        const tempBuffer = this.gpu.createGPUBuffer(this.#viewAndProjection.byteLength, [GPUBufferUsage.COPY_SRC], true);
        this.gpu.tempGPUBuffers.add(tempBuffer);
        new Float32Array(tempBuffer.getMappedRange()).set(this.#viewAndProjection);
        tempBuffer.unmap()
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.#uniformBuffer, 0,
            this.#viewAndProjection.byteLength);
    }
    readonly beforeViewUpdate: Set<(position: TerraVector3, direction: TerraVector3) => void> = new Set();
}