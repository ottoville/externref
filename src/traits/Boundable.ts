import { ObjectWorkerThread } from "../WorkerThread";
import { TerraScene } from "../TerraScene";
import { worldPosition } from "./worldPosition";

export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: Bounding,
    distance: number
}
interface Ray {
    origin: any,
    direction: any,
}
const worker = new ObjectWorkerThread('/webworkers/mesh.js');
export class Bounding  {
    static uniqueID = 0;
    readonly #uniqueID: number = Bounding.uniqueID++;
    readonly boundingBoxBuffer: SharedArrayBuffer = new SharedArrayBuffer(4 * 6);
    readonly boundingBox = new Float32Array(this.boundingBoxBuffer);

    constructor(mesh: boundable) {
        mesh.scene.boundables.add(mesh);
        queueMicrotask(() =>    //Run this on microtask so the scope who called constuctor has time to add verticesPositionBuffer property.
            worker.message(this.#uniqueID, 'init', [mesh.indicesBuffer, mesh.verticesPositionBuffer, mesh.verticesPositionStride, this.boundingBoxBuffer])
        );
    }
    public intersects(ray: Ray): Promise<PickingInfo> {
        //console.log('intersectsPromise ', this.name);
        return worker.message(this.#uniqueID, 'intersects', [ray.origin, ray.direction]);
    }
}

export interface boundable {
    scene: TerraScene,
    bounding: Bounding,
    worldPosition?: worldPosition
    indicesBuffer?: SharedArrayBuffer;
    verticesPositionBuffer: SharedArrayBuffer;
    verticesPositionStride: number;
}