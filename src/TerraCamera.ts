import { RenderPass } from "./GPU/RenderPass";

import { ObjectWorkerThread } from "./WorkerThread";
import type { GPU } from "./GPU";
import { Engine } from "./engine";
import { TerraMatrix, TerraVector3 } from "./Math";

const worker = new ObjectWorkerThread('/webworkers/cameraWorker.js');
let uniqueID = 0;

function matrixMultiplyToRef(m: ArrayLike<number>, otherM: ArrayLike<number>, result: Float32Array) {
    var tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3];
    var tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7];
    var tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11];
    var tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15];

    var om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3];
    var om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7];
    var om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11];
    var om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
    result[0] = tm0 * om0 + tm1 * om4 + tm2 * om8 + tm3 * om12;
    result[1] = tm0 * om1 + tm1 * om5 + tm2 * om9 + tm3 * om13;
    result[2] = tm0 * om2 + tm1 * om6 + tm2 * om10 + tm3 * om14;
    result[3] = tm0 * om3 + tm1 * om7 + tm2 * om11 + tm3 * om15;

    result[4] = tm4 * om0 + tm5 * om4 + tm6 * om8 + tm7 * om12;
    result[5] = tm4 * om1 + tm5 * om5 + tm6 * om9 + tm7 * om13;
    result[6] = tm4 * om2 + tm5 * om6 + tm6 * om10 + tm7 * om14;
    result[7] = tm4 * om3 + tm5 * om7 + tm6 * om11 + tm7 * om15;

    result[8] = tm8 * om0 + tm9 * om4 + tm10 * om8 + tm11 * om12;
    result[9] = tm8 * om1 + tm9 * om5 + tm10 * om9 + tm11 * om13;
    result[10] = tm8 * om2 + tm9 * om6 + tm10 * om10 + tm11 * om14;
    result[11] = tm8 * om3 + tm9 * om7 + tm10 * om11 + tm11 * om15;

    result[12] = tm12 * om0 + tm13 * om4 + tm14 * om8 + tm15 * om12;
    result[13] = tm12 * om1 + tm13 * om5 + tm14 * om9 + tm15 * om13;
    result[14] = tm12 * om2 + tm13 * om6 + tm14 * om10 + tm15 * om14;
    result[15] = tm12 * om3 + tm13 * om7 + tm14 * om11 + tm15 * om15;
    return result;
}


export class TerraCamera {
    readonly #uniqueID: number = uniqueID++;    
    childCameras: Set<TerraCamera> = new Set();
    viewport = new Viewport(0, 0, 1.0, 1.0);

    #uniformBufferSize = 4 * 16 * 2 + 3 * 4
    target = new Float32Array([-500, 0, 0]);
    #viewProjectionPositionBuffer = new SharedArrayBuffer(this.#uniformBufferSize)

    #projectionViewArr = new Float32Array(this.#viewProjectionPositionBuffer, 0, 16);
    viewArr = new TerraMatrix(this.#viewProjectionPositionBuffer, 64);

    #viewAndProjection = new Float32Array(this.#viewProjectionPositionBuffer, 0, 32);


    cameraPosition = new Float32Array(this.#viewProjectionPositionBuffer, 128, 3);
    projectionArr = new Float32Array(this.projection);

    #pickingRayBuffer = new SharedArrayBuffer(6 * 4); // origin: vec3, direction: vec3
    pickingRay = new Float32Array(this.#pickingRayBuffer);
    
    #uniformBuffer = this.gpu.createGPUBuffer(this.#uniformBufferSize, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
    #uniformBindGroup = this.gpu.createBindGroup (
        this.gpu.uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.#uniformBuffer
            }
        }, this.gpu.timeGroup);
    onRender?: () => void;
    constructor(public renderPass: RenderPass, public projection: SharedArrayBuffer, private gpu: GPU, engine:Engine, main: boolean = true, parent?:TerraCamera) {
        this.viewArr[15] = 1;
        if(parent)
            parent.childCameras.add(this);
        renderPass.cameras.add(this);
        if(main)
            worker.message(this.#uniqueID, 'init', [this.#viewProjectionPositionBuffer, this.projection, this.#pickingRayBuffer, engine.mousePositionBuffer, renderPass.size]);
    }
    doUpdateView = false;
    updateView() {
            this.viewArr[2] = this.target[0] - this.cameraPosition[0];
            this.viewArr[6] = this.target[1] - this.cameraPosition[1];
            this.viewArr[10] = this.target[2] - this.cameraPosition[2];

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
            this.viewArr[12] = -(this.viewArr[0] * this.cameraPosition[0] + this.viewArr[8] * this.cameraPosition[2])
            //y
            this.viewArr[13] = -(this.viewArr[1] * this.cameraPosition[0] + this.viewArr[5] * this.cameraPosition[1] + this.viewArr[9] * this.cameraPosition[2])
            //z
            this.viewArr[14] = -(this.viewArr[2] * this.cameraPosition[0] + this.viewArr[6] * this.cameraPosition[1] + this.viewArr[10] * this.cameraPosition[2]);

            matrixMultiplyToRef(this.viewArr, this.projectionArr, this.#projectionViewArr);
            const tempBuffer = this.gpu.createGPUBuffer(this.#viewAndProjection.byteLength, [GPUBufferUsage.COPY_SRC], true);
            new Float32Array(tempBuffer.getMappedRange()).set(this.#viewAndProjection);
            const commandBuffer = this.gpu.copyBufferToBuffer(tempBuffer, this.#uniformBuffer, this.#viewAndProjection.byteLength);
        this.gpu.pendingCommandBuffers.push(commandBuffer);
        
    }
    beforeViewUpdate:Set<() => void> = new Set();
    render(renderEncoder: GPUCommandEncoder) {
        this.onRender && this.onRender();
        //TODO: use SIMD, use column major matrix?
        if (this.doUpdateView) {
            this.childCameras.forEach(childCamera => {
                childCamera.cameraPosition[0] = this.cameraPosition[0]
                childCamera.cameraPosition[1] = this.cameraPosition[1]
                childCamera.cameraPosition[2] = this.cameraPosition[2]

                childCamera.target[0] = this.target[0]
                childCamera.target[1] = this.target[1]
                childCamera.target[2] = this.target[2];
                childCamera.doUpdateView = true;
            })
            this.beforeViewUpdate.forEach(cb => cb());
            this.updateView();
            this.doUpdateView = false;
        }
        this.renderPass.render(renderEncoder, this.#uniformBindGroup);
    }
    #nearVec3=new TerraVector3();
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