import type { DrawableDirect, DrawableIndexed, DrawableSimple } from "GPU/Drawable";
import { ObjectWorkerThread } from "./WorkerThread.js";
import { TerraNodeGPU } from "./TerraNode.js";
import { TerraMatrix, TerraVector3, TerraVector4, Triangle } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import type { ColliderJS } from "./Collider.js";

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
    memory=this.engine.wasm.memory;
    readonly pickInfo = new pickInfo();

    protected readonly colliderVerticesV4: number[] = [];
    protected readonly colliderVertices2: TerraVector4[] = [];


    readonly #triangleFaces: Triangle[] = [];
    #lastColliderTransformMatrix = new TerraMatrix();

    //readonly facesBuffer = new SharedArrayBuffer(this.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT);

    facesBufferColliderPointer?: DataView;
    lastColliderWorldVectorsPointer?: DataView;
    facesBufferColliderPointerParallel?: DataView;
    readonly verticesBuffesSize:number;
    #positionsAndCollider: [pointerToVec3:number, pointerToVec4:number][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];

    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        positionCount: number,
        verticesPositionStride: number,
        strip = false,
        point_light = 0,
        static_faces = false

    ) {
        super(scene.engine, renderPipeline, positionCount, true,true, verticesPositionStride, point_light,undefined, static_faces,strip);
        Object.getOwnPropertyNames(DataNode.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(DataNode.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.verticesBuffesSize = this.positions_count * Float32Array.BYTES_PER_ELEMENT * verticesPositionStride;


        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        scene.gpu.boundables.add(this);


        //Run this on microtask so the scope who called
        //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            //worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            //this.boundingBox.initMin();
            //this.boundingBox.initMax();
        });
    }
    initCollider() {
        if(this.faces_count === 0)
            return;
        this.facesBufferColliderPointer = this.engine.mallocView(this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT);
        this.facesBufferColliderPointerParallel = this.engine.mallocView(this.faces_count * 16 * Float32Array.BYTES_PER_ELEMENT);
        this.#positionsAndCollider.length=0;
        this.colliderVerticesV4.length=0;
        this.lastColliderWorldVectorsPointer = this.engine.mallocView(this.positions_count * 4 * Float32Array.BYTES_PER_ELEMENT);
        for (let i = 0; i < this.positions_count; i++) {
            //let pos = new TerraVector3(this.verticesPositionBuffer, i * verticesPositionStride * Float32Array.BYTES_PER_ELEMENT)
            const pos = this.vertices_pointer + i * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT;

            const colPos = this.lastColliderWorldVectorsPointer.byteOffset + i * 4 * Float32Array.BYTES_PER_ELEMENT;
            const colPos2 = new TerraVector4(this.engine.memory.buffer, this.last_collider_world_vertices_pointer + i * 4 * Float32Array.BYTES_PER_ELEMENT);
            this.colliderVerticesV4.push(colPos);
            this.colliderVertices2.push(colPos2);
            this.#positionsAndCollider.push([pos, colPos])
        }
        return this.facesBufferColliderPointer.byteOffset;
    }
    addVectors = (faceIndex: number, vectors: [pointerToVec4:number, pointerToVec4:number, pointerToVec4:number],facesBufferColliderPointer:number ) => {

        
        if (vectors.length != 3)
            throw ('less than 3 vector')
        this.#triangleFaces[faceIndex] = new Triangle(
            vectors,
            this.memory,
            () => facesBufferColliderPointer + faceIndex * 4 * 7
        );
        new Triangle(
            vectors,
            this.engine.memory, () => this.collider_faces_pointer + faceIndex * 4 * 7
        );
        new Uint32Array(
            this.memory.buffer,
            facesBufferColliderPointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
            3).set(vectors); //4 is from plane
        new Uint32Array(
            this.engine.memory.buffer,
            this.collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
            3).set(vectors); //4 is from plane
    
    }
    abstract rebuildTrianglePlanes() : void


    getPosition = (index: number) => {
        if(index > this.positions_count) {
            throw new Error('Tried to access vertice out of boundary')
        }
        return new TerraVector3(this.engine.memory.buffer, this.vertices_pointer + index * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT);
    }
    intersectsRay = (ray: Float32Array): Promise<void> => {
        return worker.message(this.id, 'intersectsRay', [ray.buffer]);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision = async (collider: ColliderJS) => {
        if (this.faces_count % 4 != 0) {  //TODO
            return
        }
        if (!collider._canDoCollision(this.bounding_min as TerraVector3, this.bounding_max as TerraVector3)) {
            return;
        }

        // Transformation matrix
        this.myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();
        if(!this.facesBufferColliderPointerParallel || !this.facesBufferColliderPointer) {
            console.error('Collider not initialized');
            return;
        }
        this.get_transformation().multiplyToRef(this.myCollisionsTransformMatrix, this.myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.myCollisionsTransformMatrix)) {

            this.#lastColliderTransformMatrix = this.myCollisionsTransformMatrix.clone();

            const timer = performance.now();

            this.#positionsAndCollider.forEach((posAndCol, i) => {
                this.getPosition(i).multiply2Ref(this.myCollisionsTransformMatrix, new TerraVector4(this.memory.buffer,posAndCol[1]));
            });
            console.log('recalculated collision vertices', performance.now() - timer);
            this.#faceQuatros.forEach((quatro, i) => {
                quatro[0].updatePlane();
                quatro[1].updatePlane();
                quatro[2].updatePlane();
                quatro[3].updatePlane();
                new Float32Array(this.memory.buffer, this.facesBufferColliderPointerParallel!.byteOffset + i * 4 * 16, 16).set([
                    quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0], //x
                    quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1], //y
                    quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2], //z
                    quatro[0].planeCollider[3], quatro[1].planeCollider[3], quatro[2].planeCollider[3], quatro[3].planeCollider[3], //d
                ]);
                new Float32Array(this.engine.memory.buffer, this.collider_planes_parallel_pointer + i * 4 * 16, 16).set([
                    quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0], //x
                    quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1], //y
                    quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2], //z
                    quatro[0].planeCollider[3], quatro[1].planeCollider[3], quatro[2].planeCollider[3], quatro[3].planeCollider[3], //d
                ]);
            });
        }

        /*   this.#faces.forEach(triangle => {
               collider._testTriangle(triangle);
           });*/
        // console.log('cpu took', performance.now() - timer);

            this.engine.wasm.testTriangles(
                this.facesBufferColliderPointer.byteOffset,
                this.facesBufferColliderPointerParallel.byteOffset,
                this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT /*  plane + vector pointers*/,
                this.id);

        if (!this.engine.collisionNotFound.getUint32(0, false)) {
            //console.log(new Uint32Array(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer, this.#faces.length * 7)) //4 is for simd
            console.log('collided')
        }
        
    }
    protected buildFaceQuatros() {
        if (this.faces_count % 4 === 0) {
            this.#faceQuatros.length=0;
            let faceQuatro: Triangle[] = [];
            this.#triangleFaces.forEach(face => {
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
/*    set setFaces(faces:Float32Array) {
        this.faces=faces;
        this.rebuildTrianglePlanes();
    }*/
    get indices_count() { return this.indicesView.length; }
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        vertices: Float32Array,
        verticesPositionStride = 3,
        indicesView: Uint32Array,
        strip = false,
        point_light = 0,
        static_faces = false
    ) {
        super(scene, renderPipeline, vertices.length/verticesPositionStride,verticesPositionStride, strip, point_light,static_faces);
        Object.getOwnPropertyNames(BoundableNodeIndexed.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(BoundableNodeIndexed.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.update_vertices(vertices);
        
        this.indicesView = indicesView
    }

    rebuildTrianglePlanes() {
        const facesBufferColliderPointer = this.initCollider();
        if(!facesBufferColliderPointer)
            return;
        let vectorsVec4: number[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.indicesView.forEach((indice: number) => {
                const vector = this.colliderVerticesV4[indice];
                if (!vector) {
                    throw ('position not found');
                }
                if (vectorsVec4.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectorsVec4 as [number, number, number],facesBufferColliderPointer);
                vectorsVec4 = [(vectorsVec4 as [number, number, number])[1], (vectorsVec4 as [number, number, number])[2]];
            });
        } else {
            this.indicesView.forEach((indice: number) => {
                //const position = this.#lastColliderWorldVectorsViewIndexed.get(indice);
                const position = this.colliderVerticesV4[indice]
                if (!position) {
                    throw ('position ' + indice + ' not found');
                }
                if (vectorsVec4.push(position) == 3) {
                    this.addVectors(faceIndex++, vectorsVec4 as [number, number, number],facesBufferColliderPointer)
                    vectorsVec4 = [];
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
        vertices:Float32Array,
        verticesPositionStride = 3,
        strip = false,
    ) {
        super(scene, renderPipeline, vertices.length/verticesPositionStride,verticesPositionStride, strip);
        this.update_vertices(vertices);
        Object.getOwnPropertyNames(BoundableNodeSimple.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(BoundableNodeSimple.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        })

        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        const facesBufferColliderPointer = this.initCollider();
        if(!facesBufferColliderPointer)
        return;

        let vectorsVec4: number[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.colliderVerticesV4.forEach(vector => {
                if (vectorsVec4.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectorsVec4 as [number, number, number], facesBufferColliderPointer)
                vectorsVec4 = [(vectorsVec4 as [number, number, number])[1], (vectorsVec4 as [number, number, number])[2]];
            });
        } else {
            this.colliderVerticesV4.forEach(vector => {
                if (vectorsVec4.push(vector) == 3) {
                    this.addVectors(faceIndex++, vectorsVec4 as [number, number, number], facesBufferColliderPointer)
                    vectorsVec4 = [];
                }
            });
        }
        this.buildFaceQuatros();
    }
}