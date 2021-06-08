import type { DrawableDirect, DrawableIndexed, DrawableSimple } from "GPU/Drawable";
import { ObjectWorkerThread } from "./WorkerThread.js";
import { TerraNodeGPU } from "./TerraNode.js";
import { TerraMatrix, TerraVector3, TerraVector4, Triangle } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { Collider } from "./Collider.js";

export type BoundableNode=DataNode<DrawableDirect>;


const worker = new ObjectWorkerThread('/js/workers/webworkers/mesh.js');
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: DataNode<DrawableDirect>,
    distance: number
}
class pickInfo {
    buffer = new SharedArrayBuffer(6 * 4);
    point = new TerraVector3(this.buffer);
    #distance = new DataView(this.buffer, 3 * 4, 4)
    getDistance() {
        return this.#distance.getFloat32(0, true);
    }
}

export abstract class DataNode<T extends DrawableDirect> extends TerraNodeGPU<T> {

    readonly pickInfo = new pickInfo();

    protected readonly colliderVertices: TerraVector4[] = [];


    readonly #faces: Triangle[] = new Array(this.faces_count);
    #lastColliderTransformMatrix = new TerraMatrix();

    //readonly facesBuffer = new SharedArrayBuffer(this.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT);

    facesBufferColliderPointer: number;
    lastColliderWorldVectorsPointer: number;
    facesBufferColliderPointerParallel: number;
    readonly verticesBuffesSize:number;
    #positionsAndCollider: [TerraVector3, TerraVector4][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];

    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        positionCount: number,
        indicesCount:number,
        public verticesPositionStride: number,
        protected strip = false,

    ) {
        super(scene.engine, renderPipeline, positionCount, true, verticesPositionStride,strip?indicesCount - 2:indicesCount / 3);
        Object.getOwnPropertyNames(DataNode.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(DataNode.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.verticesBuffesSize = this.positions_count * Float32Array.BYTES_PER_ELEMENT * verticesPositionStride;

    
        this.facesBufferColliderPointer = scene.engine.malloc(this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT);
        this.facesBufferColliderPointerParallel = scene.engine.malloc(this.faces_count * (16 + 12) * Float32Array.BYTES_PER_ELEMENT);

        this.lastColliderWorldVectorsPointer = scene.engine.malloc(positionCount * 4 * Float32Array.BYTES_PER_ELEMENT);

        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        scene.gpu.boundables.add(this); 1
        for (let i = 0; i < positionCount; i++) {
            //let pos = new TerraVector3(this.verticesPositionBuffer, i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT)
            const pos = new TerraVector3(scene.engine.memory.buffer, this.vertices_pointer + i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT);

            const colPos = new TerraVector4(this.engine.wasm.memory.buffer, this.lastColliderWorldVectorsPointer + i * 4 * Float32Array.BYTES_PER_ELEMENT);
            this.colliderVertices.push(colPos);
            this.#positionsAndCollider.push([pos, colPos])
        }

        //Run this on microtask so the scope who called
        //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            //worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            //this.boundingBox.initMin();
            //this.boundingBox.initMax();
        });
    }
    addVectors = (faceIndex: number, vectors: [TerraVector4, TerraVector4, TerraVector4]) => {
        const memory = this.engine.wasm.memory.buffer;
        if (vectors.length != 3)
            throw ('less than 3 vector')
        this.#faces[faceIndex] = new Triangle(
            vectors,
            new TerraVector4(memory, this.facesBufferColliderPointer + faceIndex * 4 * 7)
        );
        new Uint32Array(memory, this.facesBufferColliderPointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT, 3).set(vectors.map(v => v.byteOffset)); //4 is from plane
    }
    abstract rebuildTrianglePlanes: () => void


    get vertices() {
        return new Float32Array(this.engine.memory.buffer, this.vertices_pointer, this.positions_count * this.verticesPositionStride);
    }
    getPosition = (index: number) => {
        if(index > this.positions_count) {
            throw new Error('Tried to access vertice out of boundary')
        }
        return new TerraVector3(this.engine.memory.buffer, this.vertices_pointer + index * this.verticesPositionStride * Float32Array.BYTES_PER_ELEMENT);
    }
    intersectsRay = (ray: Float32Array): Promise<void> => {
        return worker.message(this.id, 'intersectsRay', [ray.buffer]);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision = async (collider: Collider) => {
        if (this.faces_count % 4 != 0) {  //TODO
            return
        }
        if (!collider._canDoCollision(this.bounding_min as TerraVector3, this.bounding_max as TerraVector3)) {
            return;
        }

        // Transformation matrix
        this.myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();

        this.get_transformation().multiplyToRef(this.myCollisionsTransformMatrix, this.myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.myCollisionsTransformMatrix)) {

            this.#lastColliderTransformMatrix = this.myCollisionsTransformMatrix.clone();

            const timer = performance.now();

            this.#positionsAndCollider.forEach((posAndCol, i) => {
                this.getPosition(i).multiply2Ref(this.myCollisionsTransformMatrix, posAndCol[1]);
            });
            console.log('recalculated collision vertices', performance.now() - timer);
            this.#faceQuatros.forEach((quatro, i) => {
                quatro[0].updatePlane();
                quatro[1].updatePlane();
                quatro[2].updatePlane();
                quatro[3].updatePlane();
                new Float32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointerParallel + i * 4 * 16, 16).set([
                    quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0], //x
                    quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1], //y
                    quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2], //z
                    quatro[0].planeCollider[3], quatro[1].planeCollider[3], quatro[2].planeCollider[3], quatro[3].planeCollider[3], //d
                ]);
            });
        }
       /* console.time('faceQuatros');
        for(let i=0; i<this.#faceQuatros.length;i++) {
            new Float32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointerParallel + i * 4 * 16, 16).set([
                this.#faceQuatros[i]![0].planeCollider[0], this.#faceQuatros[i]![1].planeCollider[0], this.#faceQuatros[i]![2].planeCollider[0], this.#faceQuatros[i]![3].planeCollider[0], //x
                this.#faceQuatros[i]![0].planeCollider[1], this.#faceQuatros[i]![1].planeCollider[1], this.#faceQuatros[i]![2].planeCollider[1], this.#faceQuatros[i]![3].planeCollider[1], //y
                this.#faceQuatros[i]![0].planeCollider[2], this.#faceQuatros[i]![1].planeCollider[2], this.#faceQuatros[i]![2].planeCollider[2], this.#faceQuatros[i]![3].planeCollider[2], //z
                this.#faceQuatros[i]![0].planeCollider[3], this.#faceQuatros[i]![1].planeCollider[3], this.#faceQuatros[i]![2].planeCollider[3], this.#faceQuatros[i]![3].planeCollider[3], //d
            ]);
        }
        console.timeEnd('faceQuatros')*/
        /*   this.#faces.forEach(triangle => {
               collider._testTriangle(triangle);
           });*/
        // console.log('cpu took', performance.now() - timer);
        // let timer = performance.now();
        // for (let i = 0; i < 20;i++)

        this.engine.wasm.testTriangles(this.facesBufferColliderPointer,this.facesBufferColliderPointerParallel, this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.id);
        if (!this.engine.collisionNotFound.getUint32(0, false)) {
            //console.log(new Uint32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer, this.#faces.length * 7)) //4 is for simd
            console.log('collided')
        }
        //  timer = performance.now();
        // for (let i = 0; i < 20; i++)
        //this.engine.wasmSIMD.testTriangles(this.facesBufferColliderPointer, this.facesBufferColliderPointerParallel, this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.uniqueID)
        //   console.log('simd took', performance.now() - timer);
    }
    protected buildFaceQuatros() {
        if (this.faces_count % 4 === 0) {
            this.#faceQuatros.length=0;
            let faceQuatro: Triangle[] = [];
            this.#faces.forEach(face => {
                if (faceQuatro.push(face) === 4) {
                    this.#faceQuatros.push(faceQuatro as [Triangle, Triangle, Triangle, Triangle])
                    faceQuatro = [];
                }
            })
        }
    }
}

export interface IndexedNode extends TerraNodeGPU<DrawableIndexed> {
    indices_count: number
}

export abstract class BoundableNodeIndexed extends DataNode<DrawableIndexed> implements IndexedNode {
    private indicesCount=0;
    get indicesView(): Uint32Array {
        return new Uint32Array(this.engine.memory.buffer,this.indices_pointer,this.indicesCount);
    }
    set indicesView(indices: Uint32Array) {
        this.indicesCount=indices.length;
        this.indices=indices;
        //this.indicesView = new Uint32Array(this.engine.memory.buffer,this.indices_pointer,indices.length);
        this.rebuildTrianglePlanes();
    }
    get indices_count() { return this.indicesView.length; }
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        positionCount: number,
        verticesPositionStride = 3,
        indicesView: Uint32Array,
        strip = false,
    ) {
        super(scene, renderPipeline, positionCount, indicesView.length,verticesPositionStride, strip);
        Object.getOwnPropertyNames(BoundableNodeIndexed.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(BoundableNodeIndexed.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        })
          
        this.indicesView = indicesView
        this.rebuildTrianglePlanes();
    }

    rebuildTrianglePlanes = () => {
        let vectors: TerraVector4[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.indicesView.forEach((indice: number) => {
                const vector = this.colliderVertices[indice];
                if (!vector) {
                    throw ('position not found');
                }
                if (vectors.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4]);
                vectors = [(vectors as [TerraVector4, TerraVector4, TerraVector4])[1], (vectors as [TerraVector4, TerraVector4, TerraVector4])[2]];
            });
        } else {
            this.indicesView.forEach((indice: number) => {
                //const position = this.#lastColliderWorldVectorsViewIndexed.get(indice);
                const position = this.colliderVertices[indice]
                if (!position) {
                    throw ('position ' + indice + ' not found');
                }
                if (vectors.push(position) == 3) {
                    this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                    vectors = [];
                }
            });
        }
        this.buildFaceQuatros();
    }
}
export abstract class BoundableNodeSimple extends DataNode<DrawableSimple> {
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        positionCount: number,
        verticesPositionStride = 3,
        strip = false,
    ) {
        super(scene, renderPipeline, positionCount,positionCount, verticesPositionStride, strip);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes = () => {
        let vectors: TerraVector4[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.colliderVertices.forEach(vector => {
                if (vectors.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                vectors = [(vectors as [TerraVector4, TerraVector4, TerraVector4])[1], (vectors as [TerraVector4, TerraVector4, TerraVector4])[2]];
            });
        } else {
            this.colliderVertices.forEach(vector => {
                if (vectors.push(vector) == 3) {
                    this.addVectors(faceIndex++, vectors as [TerraVector4, TerraVector4, TerraVector4])
                    vectors = [];
                }
            });
        }
        this.buildFaceQuatros();
    }
}