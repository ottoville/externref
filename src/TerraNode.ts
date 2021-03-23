import type { Collider } from "./Collider.js";
import type { Engine } from "./engine.js";
import { Mesh } from "/js/engine/engine.js";

import type { isLight } from "./lights.js";
import { TerraMatrix, TerraVector3, TerraVector4, Triangle } from "./Math.js";
import type { hasPhysics } from "./physics.js";
import type { Scene } from "./Scene.js";
import { ObjectWorkerThread } from "./WorkerThread.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { DrawableDirect } from "./GPU/Drawable.js";

export abstract class MainNode extends Mesh {
    readonly bufferOffsetBytes: number;

    isStatic = false;
    #rustOffset=this.gpu_pointer();
    readonly data=new Float32Array(this.engine.memory.buffer,this.#rustOffset,28);
    readonly customData= new Float32Array(this.engine.memory.buffer, this.#rustOffset+20 * Float32Array.BYTES_PER_ELEMENT, 4);
    readonly acceleration=new Float32Array(this.engine.memory.buffer,this.#rustOffset+ 24 * Float32Array.BYTES_PER_ELEMENT, 4);;
    readonly velocity=new TerraVector3(this.engine.memory.buffer,this.#rustOffset+ 16 * Float32Array.BYTES_PER_ELEMENT, 4);
    readonly transformation= new TerraMatrix(this.engine.memory.buffer,this.#rustOffset)//new TerraMatrix(this.data.buffer);
    readonly translation = new TerraVector3(this.engine.memory.buffer, this.#rustOffset+12 * Float32Array.BYTES_PER_ELEMENT);

    readonly #scaling = new TerraVector3([1, 1, 1]);
    readonly #rotation = new TerraVector4(this.engine.memory.buffer,this.rotation_pointer());

    public update = (callback: (scaling: Float32Array, rotation: Float32Array) => void) => {
        callback(this.#scaling, this.#rotation);
        this.#updateMatrix();
        this.#onUpdate();
    }
    #updateMatrix = (): void => {
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
    #onUpdate = (): void => {
        if (this instanceof BoundableNode) {
            this.boundingBox.dirtyMin = true;
            this.boundingBox.dirtyMax = true;
        }
        this.updateDynamicBuffer();
    }
    SetTranslationDelta = (value: [number, number, number] | TerraVector3) => {
        this.velocity.set(value);
        this.updateDynamicBuffer();
    }

    SetTranslation = (value: [number, number, number] | TerraVector3) => {
        this.translation.set(value);
        this.#onUpdate();
    }
    setTranslationX = (value: number) => {
        this.translation[0] = value;
        this.#onUpdate();
    }
    setTranslationY = (value: number) => {
        this.translation[1] = value;
        this.#onUpdate();
    }
    setTranslationZ = (value: number) => {
        this.translation[2] = value;
        this.#onUpdate();
    }
    constructor(public engine: Engine) {
        super();
        
        const bufferOffsetBytes = engine.gpu.DataSlots.pop();
        if (typeof (bufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.bufferOffsetBytes = bufferOffsetBytes;

        queueMicrotask(() => {
            if (this.#hasPhysics()) {
                engine.physics.tickables.add(this);
            }
            if (this.#isLight()) {
                //scene.lights.add(this);
            }
        });
        this.updateDynamicBuffer();
    }

    updateDynamicBuffer = () => {
        this.engine.gpu.queue.set(this.data, this.bufferOffsetBytes);
    }

    #hasPhysics = (): this is hasPhysics => {
        return 'hasGravity' in this && 'onPhysicTick' in this;
    }
    #isLight = (): this is isLight => {
        return 'lightType' in this;
    }
}
export class TerraNodeGPU<T extends DrawableDirect> extends MainNode {
    static uniqueID = 0;
    protected readonly uniqueID: number = TerraNodeGPU.uniqueID++;

   // abstract Drawable:DrawableDirect
    static GPUDataSize = 16 + 4 + 4 + 4;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader
    Drawable: T;
    
    destroy() {
        //this.engine.gpu.NodeInstances.delete(this);
    }

    constructor(public engine: Engine, public renderPipeline: RenderPipeline, public verticesCount:number, createDrawable: (node:TerraNodeGPU<T>) => T) {
        super(engine);
        this.Drawable = createDrawable(this);
        if(renderPipeline.dynamicBindGroupOffset.length)
            renderPipeline.dynamicBindGroupOffset[0]=this.bufferOffsetBytes;
    }

}
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: BoundableNode<DrawableDirect>,
    distance: number
}
const worker = new ObjectWorkerThread('/js/workers/webworkers/mesh.js');

class pickInfo {
    buffer = new SharedArrayBuffer(6 * 4);
    point = new TerraVector3(this.buffer);
    //distance = new Float32Array(this.buffer, 3 * 4, 1);
    #view=new DataView(this.buffer,3*4,4)
    getDistance() {
        return this.#view.getFloat32(0, true);
    }
}
class boundingBox {
    buffer = new SharedArrayBuffer(4 * 6);
    #min = new TerraVector3(this.buffer, 0);
    #max = new TerraVector3(this.buffer, 4 * 3);

    #maxOriginal: TerraVector3;
    #minOriginal: TerraVector3;

    dirtyMin = true
    dirtyMax = true
    needInitMin = true;
    needInitMax = true

    constructor(private mesh: BoundableNode<DrawableDirect>) {
        const original = new ArrayBuffer(6 * 4);
        this.#minOriginal = new TerraVector3(original, 0);
        this.#maxOriginal = new TerraVector3(original, 4 * 3);
    }

    initMin() {
        this.#minOriginal.set(new TerraVector3(this.mesh.verticesPositionBuffer));
        let value = 0;
        for (let i = 0; i < this.mesh.positionCount; i++) {
            let ii = i * this.mesh.verticesPositionStride * Float32Array.BYTES_PER_ELEMENT;
            value = this.mesh.verticesDataview.getFloat32(ii, true);
            if (value < this.#minOriginal[0])
                this.#minOriginal[0] = value;
            value = this.mesh.verticesDataview.getFloat32(ii + 4, true)
            if (value < this.#minOriginal[1])
                this.#minOriginal[1] = value;
            value = this.mesh.verticesDataview.getFloat32(ii + 8, true)
            if (value < this.#minOriginal[2])
                this.#minOriginal[2] = value;
        }
        this.needInitMin = false;
        this.updateMin();
    }
    initMax() {
        this.#maxOriginal.set(new TerraVector3(this.mesh.verticesPositionBuffer));
        let value = 0;
        for (let i = 0; i < this.mesh.positionCount; i++) {
            let ii = i * this.mesh.verticesPositionStride * Float32Array.BYTES_PER_ELEMENT;
            value = this.mesh.verticesDataview.getFloat32(ii, true);
            if (value > this.#maxOriginal[0])
                this.#maxOriginal[0] = value;
            value = this.mesh.verticesDataview.getFloat32(ii + 4, true)
            if (value > this.#maxOriginal[1])
                this.#maxOriginal[1] = value;
            value = this.mesh.verticesDataview.getFloat32(ii + 8, true)
            if (value > this.#maxOriginal[2])
                this.#maxOriginal[2] = value;
        }
        this.needInitMax = false;
        this.updateMax();
    }
    updateMin() {
        this.#minOriginal.multiply2Ref(this.mesh.transformation, this.#min);
        this.dirtyMin = false;
    }
    updateMax() {
        this.#maxOriginal.multiply2Ref(this.mesh.transformation, this.#max);
        this.dirtyMax = false;
    }
    min() {
        if (this.needInitMin) {
            this.initMin();
        }
        else if (this.dirtyMin) {
            this.#minOriginal.multiply2Ref(this.mesh.transformation, this.#min);
            this.dirtyMin = false;
        }
        return this.#min;
    }
    max() {
        if (this.needInitMax) {
            this.initMax();
        }
        else if (this.dirtyMax) {
            this.#maxOriginal.multiply2Ref(this.mesh.transformation, this.#max);
            this.dirtyMax = false;
        }
        return this.#max;
    }
}

export abstract class BoundableNode<T extends DrawableDirect> extends TerraNodeGPU<T> {

    readonly boundingBox: boundingBox;
    readonly pickInfo = new pickInfo();

    #positions: TerraVector3[] = [];
    #colliderVertices: TerraVector4[] = [];


    #faces: Triangle[];
    #lastColliderTransformMatrix = new TerraMatrix();

    //verticesCount: number;
    facesBuffer: SharedArrayBuffer;
    facesBufferColliderPointer: number;
    lastColliderWorldVectorsPointer: number;
    facesBufferColliderPointerParallel: number;
    verticesPositionBuffer: SharedArrayBuffer;
    verticesView: Omit<Float32Array, 'set'>;
    verticesBuffesSize: number;
    verticesDataview: DataView;
    #positionsAndCollider: [TerraVector3, TerraVector4][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][]=[];

    #addVectors = (faceIndex: number, vectors: [TerraVector4, TerraVector4, TerraVector4]) => {
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
    #rebuildTrianglePlanes = () => {
        let vectors: TerraVector4[] = [];
        let faceIndex = 0;
        if (this.indicesView) {
            if (this.strip) {
                this.indicesView.forEach((indice:number) => {
                    let vector = this.#colliderVertices[indice];
                    if (!vector) {
                        throw ('position not found');
                    }
                    if (vectors.push(vector) < 3)
                        return;
                    this.#addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4]);
                    vectors = [(vectors as [TerraVector4, TerraVector4, TerraVector4])[1], (vectors as [TerraVector4, TerraVector4, TerraVector4])[2]];
                });
            } else {
                this.indicesView.forEach((indice: number) => {
                    //const position = this.#lastColliderWorldVectorsViewIndexed.get(indice);
                    const position = this.#colliderVertices[indice]
                    if (!position) {
                        throw ('position ' + indice + ' not found');
                    }
                    if (vectors.push(position) == 3) {
                        this.#addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                        vectors = [];
                    }
                });
            }
        } else {
            if (this.strip) {
                this.#colliderVertices.forEach(vector => {
                    if (vectors.push(vector) < 3)
                        return;
                    this.#addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                    vectors = [(vectors as [TerraVector4, TerraVector4, TerraVector4])[1], (vectors as [TerraVector4, TerraVector4, TerraVector4])[2]];
                });
            } else {
                
                this.#colliderVertices.forEach(vector => {
                    if (vectors.push(vector) == 3) {
                        this.#addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                        vectors = [];
                    }
                });
            }
        }
        if (this.#faces.length % 4 === 0) {
            let faceQuatro: Triangle[] = [];
            this.#faces.forEach(face => {
                if (faceQuatro.push(face) === 4) {
                    this.#faceQuatros.push(faceQuatro as [Triangle, Triangle, Triangle, Triangle])
                    faceQuatro = [];
                }
            })
        }
    }

    setIndices = (indices: ArrayLike<number>) => {
        if (this.indicesView) {
            this.indicesView.set(indices);
        } else {
            this.indicesView = new Uint32Array(indices);
        }
        this.#rebuildTrianglePlanes();
    }
    updateVertices = (callback: (arr: SharedArrayBuffer) => void) => {
        callback(this.verticesPositionBuffer);
        this.boundingBox.needInitMin = true;
        this.boundingBox.needInitMax = true;
    }
    
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        public positionCount: number,
        createDrawable: (node:TerraNodeGPU<T>) => T,
        public verticesPositionStride: number = 3,
        private indicesView?: Uint32Array | Uint16Array,
        private strip = false,
        
    ) {
        super(scene.engine, renderPipeline, indicesView ? indicesView.length : positionCount, createDrawable);
        // const positionCount = (this.verticesPositionBuffer.byteLength / 4) / this.verticesPositionStride;
        this.verticesBuffesSize = positionCount * Float32Array.BYTES_PER_ELEMENT * verticesPositionStride;

        this.verticesPositionBuffer = new SharedArrayBuffer(this.verticesBuffesSize)
        this.verticesView = new Float32Array(this.verticesPositionBuffer)
        this.verticesDataview = new DataView(this.verticesPositionBuffer);
        //this.verticesCount = indicesView ? indicesView.length : positionCount;
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
        scene.boundables.add(this);1
        for (let i = 0; i < positionCount; i++) {
            let pos = new TerraVector3(this.verticesPositionBuffer, i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT)
            this.#positions.push(pos);
            //this.#colliderVertices.push(new TerraVector3(this.#lastColliderWorldVectors, i * verticesPositionStride * 4));
            let colPos = new TerraVector4(this.engine.wasm.memory.buffer, this.lastColliderWorldVectorsPointer + i * 4 * Float32Array.BYTES_PER_ELEMENT);
            this.#colliderVertices.push(colPos);
            this.#positionsAndCollider.push([pos, colPos])
        }
        this.boundingBox = new boundingBox(this);
        this.#rebuildTrianglePlanes();

            //Run this on microtask so the scope who called
            //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            this.boundingBox.initMin();
            this.boundingBox.initMax();
        });
    }
    intersectsRay=(ray: Float32Array): Promise<void> => {
        return worker.message(this.uniqueID, 'intersectsRay', [ray.buffer]);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision=async (collider: Collider) => {
        if (this.#faces.length % 4 != 0) //TODO
            return
        if (!collider._canDoCollision(this.boundingBox.min(), this.boundingBox.max())) {
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

            this.#positionsAndCollider.forEach(posAndCol => posAndCol[0].multiply2Ref(this.myCollisionsTransformMatrix, posAndCol[1]))

            console.log('recalculated collision vertices', performance.now() - timer);

            this.#faceQuatros.forEach((quatro, i) => {
                quatro[0].updatePlane();
                quatro[1].updatePlane();
                quatro[2].updatePlane();
                quatro[3].updatePlane();
                new Float32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointerParallel + i * 4 * 4 * 12, 12).set([
                    quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0],
                    quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1],
                    quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2]
                ]);

            })

        }
        
        //let timer = performance.now();
     /*   this.#faces.forEach(triangle => {
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
    constructor(engine: Engine) {
        super(engine);
    }
}