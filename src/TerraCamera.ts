import { RenderPass } from "./GPU/RenderPass";
import { Matrix, Vector3 } from "./lib/babylon/Maths/math.vector";
import { ObjectWorkerThread } from "./WorkerThread";
import type { GPU } from "./GPU";

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
    #upVector = new Float32Array([0, 1, 0]);
    #uniformBufferSwap = this.gpuscene.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);

    target = new Float32Array([0, 0, 0]);
    #viewProjectionPositionBuffer = new SharedArrayBuffer(4 * 16 * 2 + 3 * 4)

    #projectionViewArr = new Float32Array(this.#viewProjectionPositionBuffer, 0, 16);

    viewArr = new Float32Array(this.#viewProjectionPositionBuffer, 64, 16);
    cameraArr = new Float32Array(this.#viewProjectionPositionBuffer, 128, 3);
    projectionArr = new Float32Array(this.projection);

    #pickingRayBuffer = new SharedArrayBuffer(6 * 4); // origin: vec3, direction: vec3
    pickingRay = new Float32Array(this.#pickingRayBuffer);
    #uniformBuffer = this.gpuscene.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
    #uniformBindGroup = this.gpuscene.createBindGroup (
        this.gpuscene.uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.#uniformBuffer
            }
        }, this.gpuscene.timeGroup);
    //rootlayout = new BindGroupLayout(this.gpuscene, this.gpuscene.uniformBindGroupLayoutWithTime, undefined, undefined, false, true);
    constructor(public renderPass: RenderPass, mousePositionBuffer: SharedArrayBuffer, public projection:SharedArrayBuffer, private gpuscene: GPU, main:boolean=true) {
        renderPass.cameras.add(this);
        if(main)
            worker.message(this.#uniqueID, 'init', [this.#viewProjectionPositionBuffer, this.projection, this.#pickingRayBuffer, mousePositionBuffer, renderPass.size]);
    }
    render(renderEncoder: GPUCommandEncoder, time: DOMHighResTimeStamp, delta: number | null) {
        // Matrix.LookAtLHToRef(new Vector3(...this.cameraArr), new Vector3(...this.target), new Vector3(...this.#upVector), viewMatrix);
        //const target = new Vector3(...this.target);
        //  const up = new Vector3(...this.#upVector);
        //const xAxis = Vector3.Zero()//new Float32Array([0,0,0])
      //  const yAxis = Vector3.Zero();
        // const zAxis = Vector3.Zero();

        // Z axis
        // target.subtractToRef(eye, zAxis);
        //TODO: use SIMD
        const zAxis = new Float32Array([this.target[0] - this.cameraArr[0], this.target[1] - this.cameraArr[1], this.target[2] - this.cameraArr[2]]);
        const zLength = Math.sqrt(zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2]);
        if (!(zLength === 0 || zLength === 1)) {
            //zAxis.normalizeFromLength(xLength);
            const scale = 1.0 / zLength;
            zAxis[0] *= scale;
            zAxis[1] *= scale;
            zAxis[2] *= scale;
        }
        // X axis, cross product
        // Vector3.CrossToRef(up, zAxis, xAxis);
      //  console.log(Math.sqrt(zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2]));
        const xAxis = new Float32Array([
            this.#upVector[1] * zAxis[2] - this.#upVector[2] * zAxis[1],
            this.#upVector[2] * zAxis[0] - this.#upVector[0] * zAxis[2],
            this.#upVector[0] * zAxis[1] - this.#upVector[1] * zAxis[0]
        ])
        const xSquareLength = xAxis[0] * xAxis[0] + xAxis[1] * xAxis[1] + xAxis[2] * xAxis[2];

        if (xSquareLength === 0) {
            xAxis[0] = 1.0;
        } else {
            let len = Math.sqrt(xSquareLength);
           // console.log(len)
            if (!(len === 0 || len === 1.0)) {
                const scale = 1.0 / len;
                xAxis[0] *= scale;
                xAxis[1] *= scale;
                xAxis[2] *= scale;
            }

        }

        // Y axis
       // Vector3.CrossToRef(zAxis, Vector3.FromArray(xAxis), yAxis);
        const yAxis = new Float32Array([
            zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
            zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
            zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0]
        ])
        //const yLength = Math.sqrt(yAxis[0] * yAxis[0] + yAxis[1] * yAxis[1] + yAxis[2] * yAxis[2]);
       /* if (!(yLength === 0 || yLength === 1)) {
            //zAxis.normalizeFromLength(xLength);
            const scale = 1.0 / yLength;
            yAxis[0] *= scale;
            yAxis[1] *= scale;
            yAxis[2] *= scale;
        }
        */
        // Eye angles, dot products
        const ex = -(xAxis[0] * this.cameraArr[0] + xAxis[1] * this.cameraArr[1] + xAxis[2] * this.cameraArr[2])
        const ey = -(yAxis[0] * this.cameraArr[0] + yAxis[1] * this.cameraArr[1] + yAxis[2] * this.cameraArr[2])
        const ez = -(zAxis[0] * this.cameraArr[0] + zAxis[1] * this.cameraArr[1] + zAxis[2] * this.cameraArr[2])
        this.viewArr.set([xAxis[0], yAxis[0], zAxis[0], 0.0,
            xAxis[1], yAxis[1], zAxis[1], 0.0,
            xAxis[2], yAxis[2], zAxis[2], 0.0,
            ex, ey, ez, 1.0]);
        matrixMultiplyToRef(this.viewArr, this.projectionArr, this.#projectionViewArr);
        
        this.gpuscene.updateBufferRaw(this.#uniformBufferSwap, this.#uniformBuffer, this.#viewProjectionPositionBuffer).then(encoder => {
            if (encoder)
                this.gpuscene.device.defaultQueue.submit([encoder]);
        });

        this.renderPass.render(renderEncoder, this.#uniformBindGroup);
    }
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

        // matrixInvert64(matrix);
        // const inverted = Matrix.FromArray(matrix);
        //const inverted = Matrix.FromArray(matrix).invert();
        const inverted = matrix.invert();
        var nearScreenSource = Vector3.Zero()
        nearScreenSource.x = x / viewport.width * 2 - 1;
        nearScreenSource.y = -(y / viewport.height * 2 - 1);
        nearScreenSource.z = -1.0;
        var farScreenSource = (new Vector3()).copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        const nearVec3 = new Vector3();
        const farVec3 = new Vector3();
        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, inverted, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        const origin = (new Vector3()).copyFrom(nearVec3);
        const direction = new Vector3();
        farVec3.subtractToRef(nearVec3, direction);
        direction.normalize();
        return {
            origin,
            direction
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