import { Collider } from "./Collider";
import { Engine } from "./engine";

import type { isLight } from "./lights";
import { TerraMatrix, Triangle } from "./Math";
import type { hasPhysics } from "./physics";
import type { Scene } from "./Scene";
import { worldPosition } from "./traits/worldPosition";
import { ObjectWorkerThread } from "./WorkerThread";
import { TerraVector3 } from "./Math";


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

    #lastColliderWorldVectors = new SharedArrayBuffer(this.verticesPositionBuffer.byteLength);
    #lastColliderWorldVectorsView2: TerraVector3[] = [];


    #triangles: Triangle[] = [];
    #lastColliderTransformMatrix = new TerraMatrix();
    rebuildTrianglePlanes() {
        let vectors: TerraVector3[] = [];
        if (this.indicesBuffer) {
            let indices = new Uint32Array(this.indicesBuffer);
            indices.forEach(indice => {
                let vector = this.#lastColliderWorldVectorsView2[indice];
                if (!vector)
                    throw ('position not found');
                if (vectors.push(vector) == 3) {
                    this.#triangles.push(new Triangle(vectors as [TerraVector3, TerraVector3, TerraVector3]));
                    vectors = [];
                }
            });
        } else {
            this.#lastColliderWorldVectorsView2.forEach(vector => {
                if (vectors.push(vector) == 3) {
                    this.#triangles.push(new Triangle(vectors as [TerraVector3, TerraVector3, TerraVector3]));
                    vectors = [];
                }
            });            
        }
    }
    constructor(scene: Scene, public verticesPositionBuffer: SharedArrayBuffer, public verticesPositionStride: number = 3, public readonly faces?: SharedArrayBuffer) {
        super(scene.engine);
        if (faces) {
            this.facesView = new Float32Array(faces);
        }
        scene.boundables.add(this);
            //Run this on microtask so the scope who called
            //constuctor has time to add verticesPositionBuffer and indicesbuffer property.
        queueMicrotask(() => {   
            worker.message(this.uniqueID, 'init', [this.indicesBuffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            this.rebuildTrianglePlanes();
        });
        const positions = new Float32Array(this.verticesPositionBuffer);

        const len = positions.length / this.verticesPositionStride;
        for (let i = 0; i < len; i++) {
            this.vertices.push(new TerraVector3(verticesPositionBuffer, i * verticesPositionStride * 4));
            this.#lastColliderWorldVectorsView2.push(new TerraVector3(this.#lastColliderWorldVectors, i * verticesPositionStride * 4));
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
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision(collider: Collider) {
        if (!collider._canDoCollision(this.boundingBox.min, this.boundingBox.max)) {
            return;
        }
        // Transformation matrix
        this.myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();

        if (this.worldPosition)
            this.worldPosition.worldMatrix.multiplyToRef(this.myCollisionsTransformMatrix, this.myCollisionsTransformMatrix);

        if (!this.#lastColliderTransformMatrix.equals(this.myCollisionsTransformMatrix)) {
            
            this.#lastColliderTransformMatrix = this.myCollisionsTransformMatrix.clone();
            //            let lastColliderVertices = new Float32Array(this.lastColliderWorldVertices);
            //this.#colliderTrianglePlaneArray = [];
            //this.lastColliderWorldVectors = [];
            //lastColliderVertices.set(window.Wasm.calculatelastcolliderworldvertices(new Float32Array(this.verticesPositionBuffer), collisionsTransformMatrix.m as Float32Array));

            new Uint8Array(this.#lastColliderWorldVectors).set(new Uint8Array(this.verticesPositionBuffer));
            let timer = performance.now();
            let i = 0, len1 = this.#lastColliderWorldVectorsView2.length, len2 = this.#triangles.length;
            while (i < len1) {
                this.#lastColliderWorldVectorsView2[i].multiply(this.myCollisionsTransformMatrix);
                i++;
            }
            console.log('recalculated collision vertices', performance.now() - timer);
            i = 0;
            while (i < len2) {
                this.#triangles[i].createPlane();
                i++;
            }
         /*   this.#lastColliderWorldVectorsView2.forEach(v => {
                v.multiply(this.myCollisionsTransformMatrix);
            });
            this.#triangles.forEach(triangle => {
                triangle.createPlane();
            });*/
            
        }
        this.#triangles.forEach(triangle => {
            collider._testTriangle(triangle);
        });

    }
}
export class PositionNode extends TerraNode {
    worldPosition: worldPosition = new worldPosition(this);
    constructor(engine: Engine, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes);
    }
}