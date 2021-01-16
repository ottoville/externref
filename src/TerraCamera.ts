import { RenderPass } from "./GPU/RenderPass";

import { ObjectWorkerThread } from "./WorkerThread";
import type { GPU } from "./GPU";
import { Engine } from "./engine";
import { TerraMatrix, TerraVector3 } from "./Math";

const worker = new ObjectWorkerThread('/webworkers/cameraWorker.js');
let uniqueID = 0;

export class TerraCamera {
    readonly #uniqueID: number = uniqueID++;
    childCameras: Set<TerraCamera> = new Set();
    viewport = new Viewport(0, 0, 1.0, 1.0);

    #uniformBufferSize = 4 * 16 * 2 + 3 * 4
    #target = new TerraVector3([-500, 0, 0]);


    #viewProjectionPositionBuffer = new SharedArrayBuffer(this.#uniformBufferSize)

    #projectionViewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 0);
    viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

    #viewAndProjection = new Float32Array(this.#viewProjectionPositionBuffer, 0, 32);


    #position = new TerraVector3(this.#viewProjectionPositionBuffer, 128);
    projectionArr = new TerraMatrix(this.projection);

    #pickingRayBuffer = new SharedArrayBuffer(6 * 4); // origin: vec3, direction: vec3
    pickingRay = new Float32Array(this.#pickingRayBuffer);

    #uniformBuffer = this.gpu.createGPUBuffer(this.#uniformBufferSize, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
    #uniformBindGroup = this.gpu.createBindGroup(
        this.gpu.uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.#uniformBuffer
            }
        }, this.gpu.timeGroup);
    onRender?: () => void;
    target: { readonly 0: number; readonly 1: number; readonly 2: number; };
    position: { readonly 0: number; readonly 1: number; readonly 2: number; };

    update(cb: (values: { position: TerraVector3, target: TerraVector3 }) => void) {
        cb({ position: this.#position, target: this.#target });
        this.#doUpdateView = true;
    }


    constructor(public renderPass: RenderPass, public projection: SharedArrayBuffer, private gpu: GPU, engine: Engine, main: boolean = true, parent?: TerraCamera) {
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
            parent.childCameras.add(this);
        renderPass.cameras.add(this);
        if (main)
            worker.message(this.#uniqueID, 'init', [this.#viewProjectionPositionBuffer, this.projection, this.#pickingRayBuffer, engine.mousePositionBuffer, renderPass.size]);
    }
    #doUpdateView = false;
    updateView() {
        this.viewArr[2] = this.target[0] - this.#position[0];
        this.viewArr[6] = this.target[1] - this.#position[1];
        this.viewArr[10] = this.target[2] - this.#position[2];

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
            let len = Math.sqrt(xSquareLength);
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
        this.viewArr.multiplyToRef(this.projectionArr, this.#projectionViewArr)

        const tempBuffer = this.gpu.createGPUBuffer(this.#viewAndProjection.byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(tempBuffer.getMappedRange()).set(this.#viewAndProjection);
        const commandBuffer = this.gpu.copyBufferToBuffer(tempBuffer, this.#uniformBuffer, this.#viewAndProjection.byteLength);
        this.gpu.pendingCommandBuffers.push(commandBuffer);

    }
    beforeViewUpdate: Set<(position: TerraVector3, target: TerraVector3) => void> = new Set();
    render(renderEncoder: GPUCommandEncoder) {
        this.onRender && this.onRender();
        //TODO: use SIMD, use column major matrix?
        if (this.#doUpdateView) {
            this.childCameras.forEach(childCamera => {
                childCamera.update((values) => {
                    values.position[0] = this.#position[0]
                    values.position[1] = this.#position[1]
                    values.position[2] = this.#position[2]

                    values.target[0] = this.target[0]
                    values.target[1] = this.target[1]
                    values.target[2] = this.target[2];
                });
            })
            this.beforeViewUpdate.forEach(cb => cb(this.#position, this.#target));
            this.updateView();
            this.#doUpdateView = false;
        }
        this.renderPass.render(renderEncoder, this.#uniformBindGroup);
    }
    #nearVec3 = new TerraVector3();
    #farVec3 = new TerraVector3();
    createPickingRay(x: number, y: number, world?: Float32Array) {
        const viewport = {
            x: 0,
            y: 0,
            width: this.renderPass.size.width,
            height: this.renderPass.size.height
        }

        // Moving coordinates to local viewport world
        x = x - viewport.x;
        y = y - (this.renderPass.size.height - viewport.y - viewport.height);

        //Todo, reuse matrix and vector

        //const matrix = world.multiply(viewProjection);

        /*const matrix = TerraScene.tempM1;
        matrixMultiply64(world, this.viewArr, matrix);
        matrixMultiply64(matrix, this.projectionArr, matrix);
        */


        if (world) {
            var matrix = Matrix.Zero();
            const worldM = Matrix.FromArray(world);
            worldM.multiplyToRef(Matrix.FromArray(Array.from(this.viewArr)), matrix);
        } else {
            var matrix = Matrix.FromArray(Array.from(this.viewArr));
        }
        matrix.multiplyToRef(Matrix.FromArray(Array.from(this.projectionArr)), matrix);
        //TODO use matrixMultiply64 and matrixInvert64

        const inverted = new TerraMatrix(Array.from(matrix.invert().asArray()));
        /* this.nearScreenSource[0] = x / viewport.width * 2 - 1;
         this.nearScreenSource[1] = -(y / viewport.height * 2 - 1);
         this.nearScreenSource[2] = -1.0;*/
        this.#nearVec3[0] = x / viewport.width * 2 - 1;
        this.#nearVec3[1] = -(y / viewport.height * 2 - 1);
        this.#nearVec3[2] = -1.0;
        // var farScreenSource = (new Vector3()).copyFromFloats(this.nearScreenSource[0], this.nearScreenSource[1], 1.0);
        this.#farVec3 = new TerraVector3([this.#nearVec3[0], this.#nearVec3[1], 1.0]);

        // const farVec3 = new Vector3();

        /*Vector3._UnprojectFromInvertedMatrixToRef(this.nearScreenSource, inverted, nearVec3);
                Vector3.TransformCoordinatesToRef(source, matrix, result);
        const m = matrix.m;*/
        let num = this.#nearVec3[0] * inverted[3] + this.#nearVec3[1] * inverted[7] + this.#nearVec3[2] * inverted[11] + inverted[15];

        this.#nearVec3.multiply(inverted);
        if (Scalar.WithinEpsilon(num, 1.0)) {
            const scale = 1.0 / num;
            //result.scaleInPlace(1.0 / num);
            this.#nearVec3[0] *= scale;
            this.#nearVec3[1] *= scale;
            this.#nearVec3[2] *= scale;
        }


        //Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        num = this.#farVec3[0] * inverted[3] + this.#farVec3[1] * inverted[7] + this.#farVec3[2] * inverted[11] + inverted[15];
        this.#farVec3.multiply(inverted)
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


    subscribePickingRay() {
        return worker.signal(this.#uniqueID, 'subscribePickingRay');
    }
    unSubscribePickingRay() {
        return worker.signal(this.#uniqueID, 'unSubscribePickingRay');
    }
    /*createPickingRay(worldPosition: SharedArrayBuffer) {
        return worker.message(this.#uniqueID, 'createPickingRay', [worldPosition]);
    }*/
    updatePickingRay() {
        return worker.message(this.#uniqueID, 'updatePickingRay');
    }
    onResize(width: number, height: number) {
        worker.signal(this.#uniqueID, 'onResize', [width, height]);
    }

}