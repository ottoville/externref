import { RenderPass } from "./GPU/RenderPass";
import { Matrix, Vector3 } from "./lib/babylon/Maths/math.vector";
import { ObjectWorkerThread } from "./WorkerThread";
import type { GPU } from "./GPU";

const worker = new ObjectWorkerThread('/webworkers/cameraWorker.js');
let uniqueID = 0;

export class TerraCamera {
    readonly #uniqueID: number = uniqueID++;
    target = new Float32Array([0, 0, 0]);
    #upVector = new Float32Array([0, 1, 0]);

    viewProjectionPositionBuffer = new SharedArrayBuffer(4 * 16 * 2 + 3 * 4)

    projectionViewArr = new Float32Array(this.viewProjectionPositionBuffer, 0, 16);
    viewArr = new Float32Array(this.viewProjectionPositionBuffer, 64, 16);
    cameraArr = new Float32Array(this.viewProjectionPositionBuffer, 128, 3);
    projectionArr = new Float32Array(this.projection);

    pickingRayBuffer = new SharedArrayBuffer(6 * 4); // origin: vec3, direction: vec3
    pickingRay = new Float32Array(this.pickingRayBuffer);
    #uniformBufferSwap = this.gpuscene.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
    uniformBuffer = this.gpuscene.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private
    uniformBindGroup = this.gpuscene.createBindGroup(
        this.gpuscene.uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }, this.gpuscene.timeGroup);
    uniformBindGroupNoTime = this.gpuscene.createBindGroup(
        this.gpuscene.uniformBindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }
    );
    baseBindGroup = this.gpuscene.addBindGroup(this.uniformBindGroup, { animate1: false });
    baseBindGroupNoTime = this.gpuscene.addBindGroup(this.uniformBindGroupNoTime);
    constructor(private renderPass: RenderPass, mousePositionBuffer: SharedArrayBuffer, public projection:ArrayBuffer, private gpuscene: GPU) {
        renderPass.cameras.add(this);
        worker.message(this.#uniqueID, 'init', [this.viewProjectionPositionBuffer, this.projection, this.pickingRayBuffer, mousePositionBuffer, renderPass.size]);
    }
    render(renderEncoder: GPUCommandEncoder, time: DOMHighResTimeStamp) {
        const viewMatrix = Matrix.FromArray(this.viewArr);
        Matrix.LookAtLHToRef(new Vector3(...this.cameraArr), new Vector3(...this.target), new Vector3(...this.#upVector), viewMatrix);

        const modelViewProjectionMatrix = Matrix.Zero();

        viewMatrix.multiplyToRef(Matrix.FromArray(this.projectionArr), modelViewProjectionMatrix);
        this.projectionViewArr.set(modelViewProjectionMatrix.m);
        this.viewArr.set(viewMatrix.m)
        this.gpuscene.updateBufferRaw(this.#uniformBufferSwap, this.uniformBuffer, this.viewProjectionPositionBuffer).then(encoder => {
            if(encoder)
                this.gpuscene.device.defaultQueue.submit([encoder]);
        })


        this.renderPass.render(renderEncoder, time);
    }
    subscribePickingRay() {
        return worker.signal(this.#uniqueID, 'subscribePickingRay');
    }
    unSubscribePickingRay() {
        return worker.signal(this.#uniqueID, 'unSubscribePickingRay');
    }
    createPickingRay(worldPosition: SharedArrayBuffer) {
        return worker.message(this.#uniqueID, 'createPickingRay', [worldPosition]);
    }
    updatePickingRay() {
        return worker.message(this.#uniqueID, 'updatePickingRay');
    }
    onResize(width: number, height: number) {
        worker.signal(this.#uniqueID, 'onResize', [width, height]);
    }
    
}