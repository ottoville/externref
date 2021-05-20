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
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();
    readonly acceleration = new Float32Array(this.engine.memory.buffer, this.gpu_pointer + 24 * Float32Array.BYTES_PER_ELEMENT, 4);
    get_transformation = () => new TerraMatrix(this.engine.memory.buffer, this.gpu_pointer)//new TerraMatrix(this.data.buffer);

    get_velocity = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 16 * Float32Array.BYTES_PER_ELEMENT)
    }
    get_translation = () => {
        return new TerraVector3(this.engine.memory.buffer, this.gpu_pointer + 12 * Float32Array.BYTES_PER_ELEMENT);
    }

    update_scale = (x: number, y: number, z: number) => {
        super.update_scale(x, y, z)
        this.#onUpdate();
    }
    update_scale_and_rotation = (x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number) => {
        super.update_scale_and_rotation(x, y, z, rx, ry, rz, rw);
        this.#onUpdate();
    }
    #onUpdate = (): void => {
        if (this instanceof BoundableNode) {
            this.set_bounding_need_dirty_min();
            this.set_bounding_need_dirty_max();
        }
        this.updateDynamicBuffer();
    }
    SetTranslationDelta = (value: [number, number, number] | TerraVector3) => {
        this.get_velocity().set(value);
        this.updateDynamicBuffer();
    }

    SetTranslation = (value: [number, number, number] | TerraVector3) => {
        this.get_translation().set(value);
        this.#onUpdate();
    }
    /*
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
    }*/

    constructor(public engine: Engine, hasBounding: boolean, positionsCount = 0, vertices_stride = 3) {
        super(engine.rustEngine, MainNode.uniqueID++, hasBounding, true, positionsCount, vertices_stride);
        MainNode.Meshes.set(this.id, this);
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
        this.engine.gpu.queue.set(new Float32Array(this.engine.memory.buffer.slice(this.gpu_pointer, this.gpu_pointer + TerraNodeGPU.GPUDataSize * Float32Array.BYTES_PER_ELEMENT)), this.gpu_alignment);
    }

    #hasPhysics = (): this is hasPhysics => {
        return 'hasGravity' in this && 'onPhysicTick' in this;
    }
    #isLight = (): this is isLight => {
        return 'lightType' in this;
    }
}
export class TerraNodeGPU<T extends DrawableDirect> extends MainNode {

    // abstract Drawable:DrawableDirect
    static GPUDataSize = 16 + 4 + 4 + 4 + 4;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader
    Drawable: T;

    constructor(public engine: Engine, public renderPipeline: RenderPipeline, public positionsCount: number, createDrawable: (node: TerraNodeGPU<T>) => T, hasBounding = false, vertices_stride = 3,public verticesCount_deprecated: number) {
        super(engine, hasBounding, positionsCount, vertices_stride);

        this.Drawable = createDrawable(this);
        this.Drawable.dynamicBuffers.push([engine.gpu.BindGroupPosition, this.gpu_alignment]);

        if (renderPipeline.dynamicBindGroupOffset.length)
            renderPipeline.dynamicBindGroupOffset[0] = this.gpu_alignment;
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
    #distance = new DataView(this.buffer, 3 * 4, 4)
    getDistance() {
        return this.#distance.getFloat32(0, true);
    }
}
export abstract class BoundableNode<T extends DrawableDirect> extends TerraNodeGPU<T> {

    readonly pickInfo = new pickInfo();

    #colliderVertices: TerraVector4[] = [];


    readonly #faces: Triangle[];
    #lastColliderTransformMatrix = new TerraMatrix();

    facesBuffer: SharedArrayBuffer;
    facesBufferColliderPointer: number;
    lastColliderWorldVectorsPointer: number;
    facesBufferColliderPointerParallel: number;
    verticesBuffesSize: number;
    #positionsAndCollider: [TerraVector3, TerraVector4][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];

    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        positionCount: number,
        createDrawable: (node: TerraNodeGPU<T>) => T,
        public verticesPositionStride: number = 3,
        private indicesView?: (Uint32Array | Uint16Array),
        private strip = false,

    ) {
        super(scene.engine, renderPipeline, positionCount, createDrawable, true, verticesPositionStride,indicesView ? indicesView.length : positionCount);

       /* Object.getOwnPropertyNames(BoundableNode.prototype).forEach(prop =>  {
            console.log('set',prop)
            //@ts-expect-error
            this[prop] = BoundableNode.prototype[prop].bind(this);
        })*/
    


        this.verticesBuffesSize = positionCount * Float32Array.BYTES_PER_ELEMENT * verticesPositionStride;
        const indicesCount=indicesView ? indicesView.length : positionCount;
        this.#faces = new Array(this.strip?indicesCount - 2:indicesCount / 3)
        this.facesBuffer = new SharedArrayBuffer(this.#faces.length * 4 * Float32Array.BYTES_PER_ELEMENT);

        this.facesBufferColliderPointer = scene.engine.malloc(this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT);
        this.facesBufferColliderPointerParallel = scene.engine.malloc(this.#faces.length * (16 + 12) * Float32Array.BYTES_PER_ELEMENT);

        this.lastColliderWorldVectorsPointer = scene.engine.malloc(positionCount * 4 * Float32Array.BYTES_PER_ELEMENT);

        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        scene.gpu.boundables.add(this); 1
        for (let i = 0; i < positionCount; i++) {
            //let pos = new TerraVector3(this.verticesPositionBuffer, i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT)
            const pos = new TerraVector3(scene.engine.memory.buffer, this.vertices_pointer() + i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT);

            const colPos = new TerraVector4(this.engine.wasm.memory.buffer, this.lastColliderWorldVectorsPointer + i * 4 * Float32Array.BYTES_PER_ELEMENT);
            this.#colliderVertices.push(colPos);
            this.#positionsAndCollider.push([pos, colPos])
        }
        this.#rebuildTrianglePlanes();

        //Run this on microtask so the scope who called
        //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            //worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            //this.boundingBox.initMin();
            //this.boundingBox.initMax();
        });
    }
    #addVectors = (faceIndex: number, vectors: [TerraVector4, TerraVector4, TerraVector4]) => {
        const memory = this.engine.wasm.memory.buffer;
        if (vectors.length != 3)
            throw ('less than 3 vector')
        this.#faces[faceIndex] = new Triangle(
            vectors,
            new TerraVector4(memory, this.facesBufferColliderPointer + faceIndex * 4 * 7)
        );
        new Uint32Array(memory, this.facesBufferColliderPointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT, 3).set(vectors.map(v => v.byteOffset)); //4 is from plane
    }
    #rebuildTrianglePlanes = () => {
        let vectors: TerraVector4[] = [];
        let faceIndex = 0;
        if (this.indicesView) {
            if (this.strip) {
                this.indicesView.forEach((indice: number) => {
                    const vector = this.#colliderVertices[indice];
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

    setIndices = (indices: ArrayLike<number>) => {
        if (this.indicesView) {
            this.indicesView.set(indices);
        } else {
            this.indicesView = new Uint32Array(indices);
        }
        this.#rebuildTrianglePlanes();
    }
    verticesView = () => {
        return new Float32Array(this.engine.memory.buffer, this.vertices_pointer(), this.positions_count * this.verticesPositionStride);
    }
    getPosition = (index: number) => {
        if(index > this.positions_count) {
            throw new Error('Tried to access vertice out of boundary')
        }
        return new TerraVector3(this.engine.memory.buffer, this.vertices_pointer() + index * this.verticesPositionStride * Float32Array.BYTES_PER_ELEMENT);
    }
    intersectsRay = (ray: Float32Array): Promise<void> => {
        return worker.message(this.id, 'intersectsRay', [ray.buffer]);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision = async (collider: Collider) => {
        if (this.#faces.length % 4 != 0) {  //TODO
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
        console.time('faceQuatros');
        for(let i=0; i<this.#faceQuatros.length;i++) {
            new Float32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointerParallel + i * 4 * 16, 16).set([
                this.#faceQuatros[i]![0].planeCollider[0], this.#faceQuatros[i]![1].planeCollider[0], this.#faceQuatros[i]![2].planeCollider[0], this.#faceQuatros[i]![3].planeCollider[0], //x
                this.#faceQuatros[i]![0].planeCollider[1], this.#faceQuatros[i]![1].planeCollider[1], this.#faceQuatros[i]![2].planeCollider[1], this.#faceQuatros[i]![3].planeCollider[1], //y
                this.#faceQuatros[i]![0].planeCollider[2], this.#faceQuatros[i]![1].planeCollider[2], this.#faceQuatros[i]![2].planeCollider[2], this.#faceQuatros[i]![3].planeCollider[2], //z
                this.#faceQuatros[i]![0].planeCollider[3], this.#faceQuatros[i]![1].planeCollider[3], this.#faceQuatros[i]![2].planeCollider[3], this.#faceQuatros[i]![3].planeCollider[3], //d
            ]);
        }
        console.timeEnd('faceQuatros')
        /*   this.#faces.forEach(triangle => {
               collider._testTriangle(triangle);
           });*/
        // console.log('cpu took', performance.now() - timer);
        // let timer = performance.now();
        // for (let i = 0; i < 20;i++)

        this.engine.wasm.testTriangles(this.facesBufferColliderPointer,this.facesBufferColliderPointerParallel, this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.id);
        if (!this.engine.collisionNotFound.getUint32(0, false)) {
            //console.log(new Uint32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer, this.#faces.length * 7)) //4 is for simd
            console.log('collided')
        }
        //  timer = performance.now();
        // for (let i = 0; i < 20; i++)
        //this.engine.wasmSIMD.testTriangles(this.facesBufferColliderPointer, this.facesBufferColliderPointerParallel, this.#faces.length * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/, this.uniqueID)
        //   console.log('simd took', performance.now() - timer);
    }
}
export class PositionNode extends MainNode {
    constructor(engine: Engine) {
        super(engine, false);
    }
}