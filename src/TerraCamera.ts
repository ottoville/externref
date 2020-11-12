import { RenderPass } from "./GPU/RenderPass";
import { TerraScene } from "./TerraScene";
import { ObjectWorkerThread } from "./WorkerThread";

const worker = new ObjectWorkerThread('/webworkers/cameraWorker.js');
let uniqueID = 0;

export class TerraCamera {
    readonly #uniqueID: number = uniqueID++;

    viewProjectionPositionBuffer = new SharedArrayBuffer(4 * 16 * 2 + 3 * 4)
    projection = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 16);

    projectionViewArr = new Float32Array(this.viewProjectionPositionBuffer, 0, 16);
    viewArr = new Float32Array(this.viewProjectionPositionBuffer, 64, 16);
    cameraArr = new Float32Array(this.viewProjectionPositionBuffer, 128, 3);
    projectionArr = new Float32Array(this.projection);

    pickingRayBuffer = new SharedArrayBuffer(6 * 4); // origin: vec3, direction: vec3
    pickingRay = new Float32Array(this.pickingRayBuffer);


    constructor(renderPass: RenderPass, scene: TerraScene) {
        renderPass.cameras.add(this);
        worker.message(this.#uniqueID, 'init', [this.viewProjectionPositionBuffer, this.projection, this.pickingRayBuffer, scene.mousePositionBuffer, renderPass.size]);
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