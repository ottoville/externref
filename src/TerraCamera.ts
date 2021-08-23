import type { RenderPass } from "./GPU/RenderPass.js";

import { ObjectWorkerThread } from "./WorkerThread.js";
import type { GPU } from "./GPU.js";
import { GPUBufferUsage } from "./GPU.js";
import { TerraMatrix, TerraVector3 } from "./Math.js";
import type { Projection } from "./GPU/Projection.js";

const worker = new ObjectWorkerThread('/js/workers/webworkers/cameraWorker.js', {
    type: 'module'
});
let uniqueID = 0;

export class TerraCamera {
    readonly #uniqueID: number = uniqueID++;
    readonly #childCameras: Set<TerraCamera> = new Set();

    readonly #clusterArrayBuffer: GPUStorageBuffer
    #projectionUniformsBuffer: GPUUniformBuffer;

    readonly #uniformBufferSize = /* modelViewProjectionMatrix + view matrix */ 4 * 16 * 2 /* viewPosition */ + 4 * 4;
    readonly #target = new TerraVector3([-500, 0, 0]);


    readonly #viewProjectionPositionBuffer = new SharedArrayBuffer(this.#uniformBufferSize)

    readonly projectionViewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 0);
    readonly projectionViewInverted:TerraMatrix=new TerraMatrix();
    projectionViewInvertedIsDirty=false;
    readonly viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

    readonly #viewAndProjection = new Float32Array(this.#viewProjectionPositionBuffer, 0, 32);


    readonly #position = new TerraVector3(this.#viewProjectionPositionBuffer, 128);

    readonly #uniformBuffer:GPUUniformBuffer & GPUCopyDSTBuffer; //Todo: set to private
    readonly target: { readonly 0: number; readonly 1: number; readonly 2: number; };
    readonly position: { readonly 0: number; readonly 1: number; readonly 2: number; };
    readonly updateViewBindGroup: GPUBindGroup;
    readonly uniformBindGroup: () => GPUBindGroup;

    update(cb: (values: { position: TerraVector3, target: TerraVector3 }) => void) {
        cb({ position: this.#position, target: this.#target });
        this.doUpdateView = true;
    }
    
    updateProjectionUniformsBuffer(initial=false) {
        if(!initial)
            this.#projectionUniformsBuffer.destroy();
        this.#projectionUniformsBuffer = this.gpu.createGPUBuffer(this.gpu.gpu_screen_buffer_size, [GPUBufferUsage.UNIFORM], true);
        const uniformbuffer = this.#projectionUniformsBuffer.getMappedRange();

        new Float32Array(uniformbuffer, 0, 4).set([
            this.renderPass.size[0],
            this.renderPass.size[1],
            this.renderPass.size[0]/this.gpu.clustersInRow[0],
            this.renderPass.size[1]/this.gpu.clustersInRow[1]]);
        this.#projectionUniformsBuffer.unmap();
        return this.#projectionUniformsBuffer;

    }
    constructor(public renderPass: RenderPass, public projection: Projection, private gpu: GPU, parent?: TerraCamera) {
        this.#clusterArrayBuffer=gpu.createGPUBuffer(gpu.clusterSizeinBytes, [GPUBufferUsage.STORAGE]);
        this.#projectionUniformsBuffer=this.updateProjectionUniformsBuffer(true);
        this.#uniformBuffer= gpu.createGPUBuffer(this.#uniformBufferSize, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
        this.uniformBindGroup = () => this.gpu.createBindGroup(
            gpu.uniformBindGroupLayoutWithTime,
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
            {   //projection
                binding: 3,
                resource: {
                    buffer: this.#projectionUniformsBuffer
                }
            },
            {
                binding: 4,
                resource: {
                    buffer: this.gpu.GPUMeshes
                }
            },
            { //TODO: Set to own group because shared by many cameras
                binding: 5,
                resource: {
                    buffer: this.projection.gpuBuffer
                }
            }
        ]);
        this.updateViewBindGroup=this.gpu.updateViewPipeline.createBindGroup(this.gpu.viewUniformsLayout, 
            [
                {
                    binding:0,
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
        const thistarget = this.#target
        const thisposition = this.#position
        this.target = {
            get 0() {
                return thistarget[0]
            },
            get 1() {
                return thistarget[1]
            },
            get 2() {
                return thistarget[2]
            }
        }
        this.position = {
            get 0() {
                return thisposition[0]
            },
            get 1() {
                return thisposition[1]
            },
            get 2() {
                return thisposition[2]
            }
        }

        this.viewArr[15] = 1;
        if (parent)
            parent.#childCameras.add(this);
        renderPass.cameras.add(this);
        gpu.projections.add(this.projection);
    }

    updateProjection(passEncoder: GPUComputePassEncoder, computePipelineClustersLayout: GPUBindGroupLayout) {
         this.updateProjectionUniformsBuffer();
         const bindGroup = this.gpu.device.createBindGroup({
             layout: computePipelineClustersLayout,
             entries: [{
                 binding: 0,
                 resource: {
                     buffer: this.#clusterArrayBuffer
                 }
             },
             {
                 binding: 1,
                 resource: {
                     buffer: this.projection.gpuBuffer
                 }
             },
             {
                 binding: 2,
                 resource: {
                     buffer: this.#projectionUniformsBuffer
                 }
             }]
         });
         passEncoder.setBindGroup(0, bindGroup);
         passEncoder.dispatch(...this.gpu.CLUSTER_DISPATCH_SIZE);
    }
    doUpdateView = false;
    viewUpdated=false;
    updateView(commandEncoder: GPUCommandEncoder) {
        if(!this.doUpdateView)
            return;
        this.doUpdateView=false;
        this.viewUpdated=true;
        this.#childCameras.forEach(childCamera => {
            childCamera.update((values) => {
                values.position[0] = this.#position[0]
                values.position[1] = this.#position[1]
                values.position[2] = this.#position[2]

                values.target[0] = this.target[0]
                values.target[1] = this.target[1]
                values.target[2] = this.target[2];
            });
        });
        this.beforeViewUpdate.forEach(cb => cb(this.#position, this.#target));

        //for LHW this is target - position
        this.viewArr[2] = this.#position[0] - this.target[0];
        this.viewArr[6] = this.#position[1] - this.target[1];
        this.viewArr[10] = this.#position[2] - this.target[2];



        const zLength = Math.sqrt(this.viewArr[2] * this.viewArr[2] + this.viewArr[6] * this.viewArr[6] + this.viewArr[10] * this.viewArr[10]);
        if (!(zLength === 0 || zLength === 1)) {
            //zAxis.normalizeFromLength(xLength);
            const scale = 1.0 / zLength;
            this.viewArr[2] *= scale;
            this.viewArr[6] *= scale;
            this.viewArr[10] *= scale;
        }

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
        this.projectionViewInvertedIsDirty=true;
        const tempBuffer = this.gpu.createGPUBuffer(this.#viewAndProjection.byteLength, [GPUBufferUsage.COPY_SRC], true);
        this.gpu.tempGPUBuffers.add(tempBuffer);
        new Float32Array(tempBuffer.getMappedRange()).set(this.#viewAndProjection);
        tempBuffer.unmap()
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.#uniformBuffer, 0,
            this.#viewAndProjection.byteLength);
    }
    readonly beforeViewUpdate: Set<(position: TerraVector3, target: TerraVector3) => void> = new Set();
    readonly #nearVec3 = new TerraVector3();
    #farVec3 = new TerraVector3();
    createPickingRay(x: number, y: number, world?: TerraMatrix) {
        //Todo, reuse matrix and vector

        //const matrix = world.multiply(viewProjection);

        /*const matrix = TerraScene.tempM1;
        matrixMultiply64(world, this.viewArr, matrix);
        matrixMultiply64(matrix, this.projectionArr, matrix);
        */


        if (world) {
            var matrix = new TerraMatrix();
            world.multiplyToRef(this.viewArr, matrix,)
        } else {
            var matrix = this.viewArr.clone();
        }
        matrix.multiplyToRef(this.projection.projectionReversedZ, matrix);
        //TODO use matrixMultiply64 and matrixInvert64

        const inverted = new TerraMatrix();
        matrix.invertToRef(inverted);
        /* this.nearScreenSource[0] = x / viewport.width * 2 - 1;
         this.nearScreenSource[1] = -(y / viewport.height * 2 - 1);
         this.nearScreenSource[2] = -1.0;*/
        this.#nearVec3[0] = x / this.renderPass.size[0] * 2 - 1;
        this.#nearVec3[1] = -(y / this.renderPass.size[1] * 2 - 1);
        this.#nearVec3[2] = -1.0;
        // var farScreenSource = (new Vector3()).copyFromFloats(this.nearScreenSource[0], this.nearScreenSource[1], 1.0);
        this.#farVec3 = new TerraVector3([this.#nearVec3[0], this.#nearVec3[1], 1.0]);

        /*Vector3._UnprojectFromInvertedMatrixToRef(this.nearScreenSource, inverted, nearVec3);
                Vector3.TransformCoordinatesToRef(source, matrix, result);
        const m = matrix.m;*/
        let num = this.#nearVec3[0] * inverted[3] + this.#nearVec3[1] * inverted[7] + this.#nearVec3[2] * inverted[11] + inverted[15];

        this.#nearVec3.multiply2Ref(inverted, this.#nearVec3);
        if (Scalar.WithinEpsilon(num, 1.0)) {
            const scale = 1.0 / num;
            //result.scaleInPlace(1.0 / num);
            this.#nearVec3[0] *= scale;
            this.#nearVec3[1] *= scale;
            this.#nearVec3[2] *= scale;
        }


        //Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        num = this.#farVec3[0] * inverted[3] + this.#farVec3[1] * inverted[7] + this.#farVec3[2] * inverted[11] + inverted[15];
        this.#farVec3.multiply2Ref(inverted, this.#farVec3)
        if (Scalar.WithinEpsilon(num, 1.0)) {
            const scale = 1.0 / num;
            //result.scaleInPlace(1.0 / num);
            this.#farVec3[0] *= scale;
            this.#farVec3[1] *= scale;
            this.#farVec3[2] *= scale;
        }

        this.#farVec3[0] -= this.#nearVec3[0]
        this.#farVec3[1] -= this.#nearVec3[1]
        this.#farVec3[2] -= this.#nearVec3[2]
        return {
            origin: this.#nearVec3,
            direction: this.#farVec3.normalize()
        }
        // result.update(x, y, viewport.width, viewport.height, world ? world : Matrix.IdentityReadOnly, cameraViewSpace ? Matrix.IdentityReadOnly : camera.getViewMatrix(), camera.getProjectionMatrix());
    }
    onResize(width: number, height: number) {
        console.log('terracamera onresize', [width, height]);
        worker.signal(this.#uniqueID, 'onResize', [width, height]);
    }

}