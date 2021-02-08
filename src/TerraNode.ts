import { Collider } from "./Collider";
import type { Engine } from "./engine";

import type { isLight } from "./lights";
import { TerraMatrix, TerraVector4, Triangle } from "./Math";
import type { hasPhysics } from "./physics";
import type { Scene } from "./Scene";
import { ObjectWorkerThread } from "./WorkerThread";
import { TerraVector3 } from "./Math";
import { RenderPipeline } from "./GPU/RenderPipeline";
import { Drawable } from "./GPU/Drawable";

export abstract class MainNode {
    readonly bufferOffsetBytes: number;

    isStatic = false;

    readonly data: Float32Array;
    readonly customData: Float32Array;
    readonly acceleration: Float32Array;
    readonly velocity: Float32Array;
    readonly transformation: TerraMatrix;
    readonly translation: Float32Array;

    readonly #scaling = new TerraVector3([1, 1, 1]);
    readonly #rotation = new TerraVector4([0, 0, 0, 0]);

    public update(callback: (scaling: Float32Array, rotation: Float32Array) => void) {
        callback(this.#scaling, this.#rotation);
        this.updateMatrix();
        this.onUpdate();
    }
    private updateMatrix(): void {
        const x = this.#rotation[0]
        const y = this.#rotation[1]
        const z = this.#rotation[2]
        const w = this.#rotation[3];

        const x2 = x + x
        const y2 = y + y
        const z2 = z + z;

        const xx = x * x2
        const xy = x * y2
        const xz = x * z2;

        const yy = y * y2
        const yz = y * z2
        const zz = z * z2;
        var wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = this.#scaling[0]
        const sy = this.#scaling[1]
        const sz = this.#scaling[2];
        this.transformation[0] = (1 - (yy + zz)) * sx;
        this.transformation[1] = (xy + wz) * sx;
        this.transformation[2] = (xz - wy) * sx;
        this.transformation[4] = (xy - wz) * sy;
        this.transformation[5] = (1 - (xx + zz)) * sy;
        this.transformation[6] = (yz + wx) * sy;

        this.transformation[8] = (xz + wy) * sz;
        this.transformation[9] = (yz - wx) * sz;
        this.transformation[10] = (1 - (xx + yy)) * sz;
    }
    private onUpdate(): void {
        if (this instanceof BoundableNode)
            this.updateBoundingBoxByMatrix(this.transformation);
        this.updateDynamicBuffer();
    }
    SetTranslationDelta(value: [number, number, number] | [number, number] | [number] | Float32Array) {
        this.velocity.set(value);
        this.updateDynamicBuffer();
    }

    SetTranslation(value: [number, number, number] | TerraVector3) {
        this.translation.set(value);
        this.onUpdate();
    }
    setTranslationX(value: number) {
        this.translation[0] = value;
        this.onUpdate();
    }
    setTranslationY(value: number) {
        this.translation[1] = value;
        this.onUpdate();
    }
    setTranslationZ(value: number) {
        this.translation[2] = value;
        this.onUpdate();
    }
    constructor(public engine: Engine, bufferOffsetBytes?: number) {
        bufferOffsetBytes = typeof (bufferOffsetBytes) == "number" ? bufferOffsetBytes : engine.gpu.DataSlots.pop();
        if (typeof (bufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.bufferOffsetBytes = bufferOffsetBytes;
        this.data = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes, TerraNodeGPU.GPUDataSize);
        this.transformation = new TerraMatrix(this.engine.gpu.CPUData, bufferOffsetBytes);
        this.translation = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 12 * Float32Array.BYTES_PER_ELEMENT, 4)
        this.velocity = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 16 * Float32Array.BYTES_PER_ELEMENT, 4);
        this.customData = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 20 * Float32Array.BYTES_PER_ELEMENT, 4);
        this.acceleration = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 24 * Float32Array.BYTES_PER_ELEMENT, 4);





        //engine.gpu.NodeInstances.set(this, engine.gpu.NodeInstances.size * TerraNodeGPU.alignment);
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
            0, 0, 0, 0,
            //custom data end
            //acceleration starts
            0, 0, 0, 0
            //acceleration ends
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

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }
}
export abstract class TerraNodeGPU extends MainNode {
    static uniqueID = 0;
    protected readonly uniqueID: number = TerraNodeGPU.uniqueID++;
    
    abstract Drawable:Drawable
    static GPUDataSize = 16 + 4 + 4
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader

    //readonly dataBuffer = new ArrayBuffer(TerraNode.GPUDataSize);

    destroy() {
        //this.engine.gpu.NodeInstances.delete(this);
    }

    constructor(public engine: Engine, public renderPipeline: RenderPipeline, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes)
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

export abstract class BoundableNode extends TerraNodeGPU {
   

    readonly boundingBox = new boundingBox();
    readonly pickInfo = new pickInfo();


    #positions: TerraVector3[] = [];
    #colliderVertices: TerraVector4[] = [];


    #faces: Triangle[];
    #lastColliderTransformMatrix = new TerraMatrix();

    verticesCount: number;
    facesBuffer: SharedArrayBuffer;
    facesBufferColliderPointer: number;
    lastColliderWorldVectorsPointer: number;
    facesBufferColliderPointerParallel: number;

    addVectors(faceIndex: number, vectors: [TerraVector4, TerraVector4, TerraVector4]) {
        try {
            if (vectors.length != 3)
                throw('less than 3 vector')
            const t = new Triangle(
                vectors as [TerraVector4, TerraVector4, TerraVector4],
                new TerraVector4(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer + faceIndex * 4 * 7)
            );
            t.pointers = new Uint32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,3); //4 is from plane
            t.pointers.set(vectors.map(v => v.byteOffset) as [number, number, number]);
            this.#faces[faceIndex] = t;
        } catch (e) {
            console.log(e);
            debugger;
        }
    }
    rebuildTrianglePlanes() {
        let vectors: TerraVector4[] = [];
        let faceIndex = 0;
        if (this.indicesView) {
            if (this.strip) {
                this.indicesView.forEach((indice:number) => {
                    let vector = this.#colliderVertices[indice];
                    if (!vector) {
                        debugger;

                        throw ('position not found');
                    }
                    if (vectors.push(vector) < 3)
                        return;
                    this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4]);
                    vectors = [vectors[1], vectors[2]];
                });
            } else {
                this.indicesView.forEach((indice: number) => {
                    //const position = this.#lastColliderWorldVectorsViewIndexed.get(indice);
                    const position = this.#colliderVertices[indice]
                    if (!position) {
                        debugger;
                        throw ('position ' + indice + ' not found');
                    }
                    if (vectors.push(position) == 3) {
                        this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                        vectors = [];
                    }
                });
            }
        } else {
            if (this.strip) {
                this.#colliderVertices.forEach(vector => {
                    if (vectors.push(vector) < 3)
                        return;
                    this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                    vectors = [vectors[1], vectors[2]];
                });
            } else {
                
                this.#colliderVertices.forEach(vector => {
                    if (vectors.push(vector) == 3) {
                        this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                        vectors = [];
                    }
                });
            }
        }
    }

    set indices(indices: ArrayLike<number>) {
        if (this.indicesView) {
            this.indicesView.set(indices);
        } else {
            this.indicesView = new Uint32Array(indices);
        }
        this.rebuildTrianglePlanes();
    }
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        public readonly verticesPositionBuffer: SharedArrayBuffer,
        public verticesPositionStride: number = 3,
        private indicesView?: Uint32Array | Uint16Array,        
        private strip = false,
        
    ) {
        super(scene.engine, renderPipeline);
        const positionCount = (this.verticesPositionBuffer.byteLength / 4) / this.verticesPositionStride;
        this.verticesCount = indicesView ? indicesView.length : positionCount;
        if (this.strip) {
            this.#faces = new Array(this.verticesCount - 2)
        }
        else {
            this.#faces = new Array(this.verticesCount / 3);
        }
        this.facesBuffer = new SharedArrayBuffer(this.#faces.length * 4 * Float32Array.BYTES_PER_ELEMENT);

        this.facesBufferColliderPointer = scene.engine.malloc(this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT);
        this.facesBufferColliderPointerParallel = scene.engine.malloc(this.#faces.length * (16+12) * Float32Array.BYTES_PER_ELEMENT);

        this.lastColliderWorldVectorsPointer = scene.engine.malloc(positionCount * 4 * Float32Array.BYTES_PER_ELEMENT);
        
        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        scene.boundables.add(this);

        for (let i = 0; i < positionCount; i++) {
            this.#positions.push(new TerraVector3(this.verticesPositionBuffer, i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT));

            //this.#colliderVertices.push(new TerraVector3(this.#lastColliderWorldVectors, i * verticesPositionStride * 4));
            this.#colliderVertices.push(new TerraVector4(this.engine.wasm.memory.buffer, this.lastColliderWorldVectorsPointer + i * 4 * Float32Array.BYTES_PER_ELEMENT));
        }
        this.rebuildTrianglePlanes();

            //Run this on microtask so the scope who called
            //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
        });
    }
    public intersectsRay(ray: Float32Array): Promise<void> {
        return worker.message(this.uniqueID, 'intersectsRay', [ray.buffer]);
    }
    public updateBoundingBoxByMatrix(m: TerraMatrix) {
        //TODO: Use SIMD
        this.boundingBox.min.multiply2Ref(m, this.boundingBox.min);
        this.boundingBox.max.multiply2Ref(m, this.boundingBox.max);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public async checkCollision(collider: Collider) {
        if (this.#faces.length % 4 != 0) //TODO
            return
        if (!collider._canDoCollision(this.boundingBox.min, this.boundingBox.max)) {
            return;
        }
        // Transformation matrix
        this.myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();

        this.transformation.multiplyToRef(this.myCollisionsTransformMatrix, this.myCollisionsTransformMatrix);

        if (!this.#lastColliderTransformMatrix.equals(this.myCollisionsTransformMatrix)) {
            
            this.#lastColliderTransformMatrix = this.myCollisionsTransformMatrix.clone();
            console.log('verticesPositionBuffer', this.verticesPositionBuffer.byteLength)
            //new Uint8Array(this.engine.wasm.memory.buffer, this.lastColliderWorldVectorsPointer, this.verticesPositionBuffer.byteLength).set(new Uint8Array(this.verticesPositionBuffer));
           // new Uint8Array(this.engine.wasm.memory.buffer, this.facesBuffer.byteLength).set(new Uint8Array(this.verticesPositionBuffer));

            let timer = performance.now();
            let i = 0
            let len1 = this.#positions.length
            let len2 = this.#faces.length;

            while (i < len1) {
                this.#positions[i].multiply2Ref(this.myCollisionsTransformMatrix,this.#colliderVertices[i])
               // this.#colliderVertices[i].multiply(this.myCollisionsTransformMatrix);
                i++;
            }
            console.log('recalculated collision vertices', performance.now() - timer);
            i = 0;
            while (i < len2) {
                
                
                this.#faces[i].updatePlane();
                this.#faces[i + 1].updatePlane();
                this.#faces[i + 2].updatePlane();
                this.#faces[i + 3].updatePlane();
                new Float32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointerParallel + i * 4 * 12, 12).set([
                    this.#faces[i].planeCollider[0], this.#faces[i + 1].planeCollider[0], this.#faces[i + 2].planeCollider[0], this.#faces[i + 3].planeCollider[0],
                    this.#faces[i].planeCollider[1], this.#faces[i + 1].planeCollider[1], this.#faces[i + 2].planeCollider[1], this.#faces[i + 3].planeCollider[1],
                    this.#faces[i].planeCollider[2], this.#faces[i + 1].planeCollider[2], this.#faces[i + 2].planeCollider[2], this.#faces[i + 3].planeCollider[2]
                ]);
                i+=4;
            }
        }
        
        //let timer = performance.now();
       /* this.#faces.forEach(triangle => {
            collider._testTriangle(triangle);
        });*/
       // console.log('cpu took', performance.now() - timer);
       // let timer = performance.now();
       // for (let i = 0; i < 20;i++)
        this.engine.wasm.testTriangles(this.facesBufferColliderPointer, this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.uniqueID)
       // console.log('wasm took', performance.now() - timer);
      //  timer = performance.now();
       // for (let i = 0; i < 20; i++)
        //this.engine.wasmSIMD.testTriangles(this.facesBufferColliderPointer, this.facesBufferColliderPointerParallel, this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.uniqueID)
     //   console.log('simd took', performance.now() - timer);
    }
}
export class PositionNode extends MainNode {
    constructor(engine: Engine, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes);
    }
}