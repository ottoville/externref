import { Collider } from "./Collider";
import { Engine } from "./engine";

import type { isLight } from "./lights";
import { TerraMatrix } from "./Math";
import type { hasPhysics } from "./physics";
import type { Scene } from "./Scene";
import { worldPosition } from "./traits/worldPosition";
import { ObjectWorkerThread } from "./WorkerThread";
import { TerraVector3 } from "./Math";


/*

function Vector3Multiply(vector: Float32Array | Float64Array, m: ArrayLike<number>): void {
    var rx = vector[0] * m[0] + vector[1] * m[4] + vector[2] * m[8] + m[12];
    var ry = vector[0] * m[1] + vector[1] * m[5] + vector[2] * m[9] + m[13];
    var rz = vector[0] * m[2] + vector[1] * m[6] + vector[2] * m[10] + m[14];
    var rw = 1 / (vector[0] * m[3] + vector[1] * m[7] + vector[2] * m[11] + m[15]);

    vector[0] = rx * rw;
    vector[1] = ry * rw;
    vector[2] = rz * rw;
}*/
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
    point = new TerraVector3(this.buffer);
    distance = new Float32Array(this.buffer, 3 * 4, 1);
}
class boundingBox {
    buffer = new SharedArrayBuffer(4 * 6);
    box = new Float32Array(this.buffer);
    min = new TerraVector3(this.buffer, 0);
    max = new TerraVector3(this.buffer, 4 * 3);
}
export abstract class BoundableNode extends TerraNode {
    indicesBuffer?: SharedArrayBuffer | undefined;

    readonly boundingBox = new boundingBox();
    readonly pickInfo = new pickInfo();
    readonly facesView?: Float32Array;

    //verticesBuffer: ArrayBuffer = new ArrayBuffer((3 * this.verticesPositionBuffer.byteLength) / this.verticesPositionStride);
    vertices: TerraVector3[] = [];

    lastColliderWorldVectors = new SharedArrayBuffer(this.verticesPositionBuffer.byteLength);
    lastColliderWorldVectorsView2: TerraVector3[] = [];



    constructor(scene: Scene, public verticesPositionBuffer: SharedArrayBuffer, public verticesPositionStride: number = 3, public readonly faces?: SharedArrayBuffer) {
        super(scene.engine);
        if (faces) {
            this.facesView = new Float32Array(faces);
        }
        scene.boundables.add(this);
        queueMicrotask(() => {    //Run this on microtask so the scope who called constuctor has time to add verticesPositionBuffer property.
            worker.message(this.uniqueID, 'init', [this.indicesBuffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
        });
        const positions = new Float32Array(this.verticesPositionBuffer);

        const len = positions.length / this.verticesPositionStride;
        for (let i = 0; i < len; i++) {
            const v = new TerraVector3(verticesPositionBuffer, i * verticesPositionStride * 4);
            this.lastColliderWorldVectorsView2.push(new TerraVector3(this.lastColliderWorldVectors, i * verticesPositionStride * 4));
            v.set([
                positions[i * this.verticesPositionStride],
                positions[i * this.verticesPositionStride + 1],
                positions[i * this.verticesPositionStride + 2]
            ])
            this.vertices.push(v)
        }
    }
    public intersectsRay(ray: Float32Array): Promise<void> {
        return worker.message(this.uniqueID, 'intersectsRay', [ray.buffer]);
    }
    public updateBoundingBoxByMatrix(m: TerraMatrix) {
        //TODO: Use SIMD
        this.boundingBox.min.multiply(m);
        this.boundingBox.max.multiply(m);
    }

    lastColliderTransformMatrix=new TerraMatrix();
    trianglePlaneArray = [];
    tmpVec = new TerraVector3();
    public checkCollision(collider: Collider) {
        if (!collider._canDoCollision(this.boundingBox.min, this.boundingBox.max)) {
            return;
        }
        // Transformation matrix
        const collisionsScalingMatrix = new TerraMatrix([
            1.0 / collider._radius[0], 0.0, 0.0, 0.0,
            0.0, 1.0 / collider._radius[1], 0.0, 0.0,
            0.0, 0.0, 1.0 / collider._radius[2], 0.0,
            0.0, 0.0, 0.0, 1.0]);
        const collisionsTransformMatrix = collisionsScalingMatrix;
        if (this.worldPosition)
            this.worldPosition.worldMatrix.multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);

        if (!this.lastColliderTransformMatrix.equals(collisionsTransformMatrix)) {
            console.log('recalculating collision vertices ');
            this.lastColliderTransformMatrix = collisionsTransformMatrix.clone();

            //            let lastColliderVertices = new Float32Array(this.lastColliderWorldVertices);
            this.trianglePlaneArray = [];
            //this.lastColliderWorldVectors = [];
            //lastColliderVertices.set(window.Wasm.calculatelastcolliderworldvertices(new Float32Array(this.verticesPositionBuffer), collisionsTransformMatrix.m as Float32Array));

            new Uint8Array(this.lastColliderWorldVectors).set(new Uint8Array(this.verticesPositionBuffer));
            this.lastColliderWorldVectorsView2.forEach(v => {
                v.multiply(collisionsTransformMatrix);
            });
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