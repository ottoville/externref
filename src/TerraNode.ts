import { Collider } from "./Collider";
import { Engine } from "./engine";

import type { isLight } from "./lights";
import type { hasPhysics } from "./physics";
import type { Scene } from "./Scene";
import { worldPosition } from "./traits/worldPosition";
import { ObjectWorkerThread } from "./WorkerThread";


/*
function matrixMultiply(m: ArrayLike<number>, otherM: ArrayLike<number>): number[] {
    var tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3];
    var tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7];
    var tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11];
    var tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15];

    var om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3];
    var om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7];
    var om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11];
    var om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
    const result: number[] = [];
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
}*/
function Vector3Multiply(vector: Float32Array | Float64Array, m: ArrayLike<number>): void {
    var rx = vector[0] * m[0] + vector[1] * m[4] + vector[2] * m[8] + m[12];
    var ry = vector[0] * m[1] + vector[1] * m[5] + vector[2] * m[9] + m[13];
    var rz = vector[0] * m[2] + vector[1] * m[6] + vector[2] * m[10] + m[14];
    var rw = 1 / (vector[0] * m[3] + vector[1] * m[7] + vector[2] * m[11] + m[15]);

    vector[0] = rx * rw;
    vector[1] = ry * rw;
    vector[2] = rz * rw;
}
export abstract class TerraNode implements Partial<hasPhysics> {
    static uniqueID = 0;
    protected readonly uniqueID: number = TerraNode.uniqueID++;
    abstract worldPosition?: worldPosition

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }
    static GPUDataSize = 16 + 4 + 4
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader

    //readonly dataBuffer = new ArrayBuffer(TerraNode.GPUDataSize);
    readonly bufferOffsetBytes: number;

    readonly data: Float32Array;
    readonly customData: Float32Array;

    destroy() {
        this.engine.gpu.NodeInstances.delete(this);
    }

    constructor(public engine: Engine, bufferOffsetBytes?: number) {
        bufferOffsetBytes = typeof (bufferOffsetBytes) == "number" ? bufferOffsetBytes : engine.gpu.DataSlots.pop();
        if (typeof (bufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.bufferOffsetBytes = bufferOffsetBytes;
        this.data = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes, TerraNode.GPUDataSize);
        this.customData = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 20 * 4, 4);


        engine.gpu.NodeInstances.set(this, engine.gpu.NodeInstances.size * TerraNode.alignment);
        this.data.set([
            //3d matrix start, 64 bytes
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
            //3d matrix end
            //delta start, 12 bytes + alignment 4 byte
            0, 0, 0, 0,
            //delta end
            //custom data start, 16 bytes
            0, 0, 0, 0
            //custom data end
        ])
        queueMicrotask(() => {
            if (this.hasPhysics()) {
                engine.physics.tickables.add(this);
            }
            if (this.isLight()) {
                //scene.lights.add(this);
            }
        });
        this.updateDynamicBuffer();
    }

    async updateDynamicBuffer() {
        this.engine.gpu.queue.set(this.data, this.bufferOffsetBytes);
    }
}
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: BoundableNode,
    distance: number
}
const worker = new ObjectWorkerThread('/webworkers/mesh.js');

class pickInfo {
    buffer = new SharedArrayBuffer(6 * 4);
    point = new Float32Array(this.buffer, 0, 3);
    distance = new Float32Array(this.buffer, 3 * 4, 1);
}
class boundingBox {
    buffer = new SharedArrayBuffer(4 * 6);
    box = new Float32Array(this.buffer);
    min = new Float32Array(this.buffer, 0, 3);
    max = new Float32Array(this.buffer, 4 * 3, 3);
}
export abstract class BoundableNode extends TerraNode {
    indicesBuffer?: SharedArrayBuffer | undefined;

    readonly boundingBox = new boundingBox();
    readonly pickInfo = new pickInfo();
    readonly facesView?: Float32Array;
    lastColliderWorldVectors = new SharedArrayBuffer((3 * this.verticesPositionBuffer.byteLength) / this.verticesPositionStride);
    lastColliderWorldVectorsView = new Float32Array(this.lastColliderWorldVectors);
    lastColliderWorldVectorsView2: Float32Array[] = [];

    constructor(scene: Scene, public verticesPositionBuffer: SharedArrayBuffer, public verticesPositionStride: number = 3, public readonly faces?: SharedArrayBuffer) {
        super(scene.engine);
        if (faces) {
            this.facesView = new Float32Array(faces);
        }
        scene.boundables.add(this);
        queueMicrotask(() => {    //Run this on microtask so the scope who called constuctor has time to add verticesPositionBuffer property.
            worker.message(this.uniqueID, 'init', [this.indicesBuffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
        }
        );
    }
    public intersectsRay(ray: Float32Array): Promise<void> {
        return worker.message(this.uniqueID, 'intersectsRay', [ray.buffer]);
    }
    public updateBoundingBoxByMatrix(m: Float32Array) {
        //TODO: Use SIMD
        Vector3Multiply(this.boundingBox.min, m);
        Vector3Multiply(this.boundingBox.max, m);
    }

    lastColliderWorldVertices: SharedArrayBuffer | null = null;
    lastColliderTransformMatrix: Matrix = Matrix.Zero();
    trianglePlaneArray = [];

    public checkCollision(collider: Collider) {
        if (!collider._canDoCollision(this.boundingBox.min, this.boundingBox.max)) {
            return;
        }
        // Transformation matrix
        const collisionsScalingMatrix = new Matrix();
        Matrix.ScalingToRef(1.0 / collider._radius[0], 1.0 / collider._radius[1], 1.0 / collider._radius[2], collisionsScalingMatrix);
        const collisionsTransformMatrix = collisionsScalingMatrix;
        if (this.worldPosition)
            Matrix.FromArray(this.worldPosition.worldMatrix).multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);

        if (!this.lastColliderWorldVertices || !this.lastColliderTransformMatrix.equals(collisionsTransformMatrix)) {
            console.log('recalculating collision vertices ');
            this.lastColliderTransformMatrix = collisionsTransformMatrix.clone();
            this.lastColliderWorldVertices = new SharedArrayBuffer(this.verticesPositionBuffer.byteLength);
            //            let lastColliderVertices = new Float32Array(this.lastColliderWorldVertices);
            this.trianglePlaneArray = [];
            //this.lastColliderWorldVectors = [];
            //lastColliderVertices.set(window.Wasm.calculatelastcolliderworldvertices(new Float32Array(this.verticesPositionBuffer), collisionsTransformMatrix.m as Float32Array));

            const positions = new Float32Array(this.verticesPositionBuffer);
            const tmpVec = Vector3.Zero();
            const len = positions.length / this.verticesPositionStride;
            this.lastColliderWorldVectorsView2 = [];
            for (let i = 0; i < len; i++) {
                tmpVec.x = positions[i * this.verticesPositionStride];
                tmpVec.y = positions[i * this.verticesPositionStride + 1];
                tmpVec.z = positions[i * this.verticesPositionStride + 2];
                //this.lastColliderWorldVectors.push(Vector3.TransformCoordinates(tmpVec, collisionsTransformMatrix));
                const transformed = Vector3.TransformCoordinates(tmpVec, collisionsTransformMatrix);
                if (isNaN(transformed.x))
                    debugger;
                this.lastColliderWorldVectorsView[i * 3] = transformed.x
                this.lastColliderWorldVectorsView[i * 3 + 1] = transformed.y
                this.lastColliderWorldVectorsView[i * 3 + 2] = transformed.z
                this.lastColliderWorldVectorsView2.push(new Float32Array(this.lastColliderWorldVectors, i * 3 * 4, 3))

            }
            /*   console.log(positions)
               console.log(this.lastColliderWorldVectorsView)
               console.log(this.lastColliderWorldVectorsView2)*/
        }

        if (!this.indicesBuffer) {
            for (let i = 0; i < this.lastColliderWorldVectorsView2.length/3; i += 3) {
                const p1 = this.lastColliderWorldVectorsView2[i];
                const p2 = this.lastColliderWorldVectorsView2[i + 1];
                const p3 = this.lastColliderWorldVectorsView2[i + 2];
 
                 collider._testTriangle(i, this.trianglePlaneArray, p3, p2, p1);
             }
            return;
        }
        let indices = new Uint32Array(this.indicesBuffer);
        let lenn = indices.length;
        try {
            for (var i = 0; i < lenn; i += 3) {
                var pp1 = this.lastColliderWorldVectorsView2[indices[i]];
                var pp2 = this.lastColliderWorldVectorsView2[indices[i + 1]];
                var pp3 = this.lastColliderWorldVectorsView2[indices[i + 2]];

                collider._testTriangle(i, this.trianglePlaneArray, pp3, pp2, pp1);

            }
        } catch (e) {
            console.log(e);
            debugger;
        }

    }
}
export class PositionNode extends TerraNode {
    worldPosition: worldPosition = new worldPosition(this);
    constructor(engine: Engine, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes);
    }
}