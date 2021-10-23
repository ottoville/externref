import { ObjectWorkerThread } from "./WorkerThread.js";
import { MainNode } from "./MainNode.js";
import { TerraMatrix, TerraVector3, TerraVector4, Triangle } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { ColliderJS } from "./Collider.js";
import type { Engine } from "engine.js";
declare const engine:Engine;

const worker = new ObjectWorkerThread('/js/workers/webworkers/mesh.js');
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: DataNode,
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

export abstract class DataNode extends MainNode {
    readonly pickInfo = new pickInfo();
    protected readonly colliderVerticesV4: number[] = [];
    readonly #triangleFaces: Triangle[] = [];
    #lastColliderTransformMatrix = new TerraMatrix();

   // facesBufferColliderPointer?: DataView;
    //lastColliderWorldVectorsPointer?: DataView;
    //facesBufferColliderPointerParallel?: DataView;
    #positionsAndCollider: [pointerToVec3:number, pointerToVec4:number][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];
    get vertices() {
        return new Float32Array(engine.memory.buffer, this.vertices_pointer, this.vertices_count * this.vertices_stride);
    }
 
    constructor(
        positionCount: number,
        verticesPositionStride: number,
        has_physic = false,
        strip = false,
        point_light = 0,
        static_faces = false,
        label:string,
        scenes?: Scene[],
    ) {
        super(true, true, positionCount, verticesPositionStride, point_light,undefined, static_faces,strip,label,scenes);
        Object.getOwnPropertyNames(DataNode.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(DataNode.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });


        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        if(has_physic)
            engine.physics.tickables.add(this);


        //Run this on microtask so the scope who called
        //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            //worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
            //this.boundingBox.initMin();
            //this.boundingBox.initMax();
        });
    }
    override destroy() {
        engine.physics.tickables.delete(this)
        super.destroy()
    }
    initCollider() {
        //TODO: Calculate on demand
        if(this.faces_count === 0 || this.vertices_count===0)
            return false;
        this.#positionsAndCollider.length=0;
        this.colliderVerticesV4.length=0;
        //this.lastColliderWorldVectorsPointer = this.engine.mallocView(this.positions_count * 4 * Float32Array.BYTES_PER_ELEMENT);
        for (let i = 0; i < this.vertices_count; i++) {
            const pos = this.vertices_pointer + i * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT;
            const colPos = this.last_collider_world_vertices_pointer + i * 4 * Float32Array.BYTES_PER_ELEMENT;
            this.colliderVerticesV4.push(colPos);
            this.#positionsAndCollider.push([pos, colPos])
        }
        //return this.facesBufferColliderPointer.byteOffset;
        return true;
    }
    addVectors = (faceIndex: number, vectors: [pointerToVec4:number, pointerToVec4:number, pointerToVec4:number] ) => {
        if (vectors.length != 3)
            throw ('less than 3 vector')
        this.#triangleFaces[faceIndex] = new Triangle(
            vectors,
            () => this.collider_faces_pointer + faceIndex * 4 * 7);
       /* new Triangle(
            vectors,
            new Float32Array(this.engine.memory.buffer, this.collider_faces_pointer + faceIndex * 4 * 7,4) as TerraVector4
        );*/
        new Uint32Array(
            engine.memory.buffer,
            this.collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
            3).set(vectors); //4 is from plane
      /*  new Uint32Array(
            this.engine.memory.buffer,
            this.collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
            3).set(vectors.map(v => v.byteOffset)); //4 is from plane*/
    
    }
    abstract rebuildTrianglePlanes() : void


    getPosition = (index: number) => {
        if(index > this.positions_count) {
            throw new Error('Tried to access vertice out of boundary')
        }
        return new TerraVector3(engine.memory.buffer, this.vertices_pointer + index * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT);
    }
    intersectsRay = (ray: Float32Array): Promise<void> => {
        //@ts-expect-error wasm-bindgen
        return worker.message(this.id, 'intersectsRay', [ray.buffer]);
    }
    #updateColliderPlanes() {
        this.#positionsAndCollider.forEach((posAndCol, i) => {
            this.getPosition(i).multiply2Ref(this.#myCollisionsTransformMatrix, new TerraVector4(engine.memory.buffer,posAndCol[1]));
        });
        this.#faceQuatros.forEach((quatro, i) => {
            quatro[0].updatePlane();
            quatro[1].updatePlane();
            quatro[2].updatePlane();
            quatro[3].updatePlane();
            new Float32Array(engine.memory.buffer, this.collider_planes_parallel_pointer + i * 4 * 16, 16).set([
                quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0], //x
                quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1], //y
                quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2], //z
                quatro[0].planeCollider[3], quatro[1].planeCollider[3], quatro[2].planeCollider[3], quatro[3].planeCollider[3], //d
            ]);
        });
    }
    //collisionsScalingMatrix = new TerraMatrix();
    #myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision (collider: ColliderJS) {
        if (this.faces_count % 4 != 0) {  //TODO
            return
        }
        //console.log(this.label, this.bounding_min, this.bounding_max)
        if (!collider._canDoCollision(this.bounding_min, this.bounding_max)) {
            return;
        }
        // Transformation matrix
        this.#myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();

        this.get_transformation().multiplyToRef(this.#myCollisionsTransformMatrix, this.#myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.#myCollisionsTransformMatrix)) {
            this.#lastColliderTransformMatrix = this.#myCollisionsTransformMatrix.clone();
            this.#updateColliderPlanes();
        }
            /*const scaledPosition=collider.scaledPosition;
            const scaledVelocity=collider.scaledVelocity
            this.#triangleFaces.forEach(triangle => {
               collider._testTriangle(triangle, scaledPosition, scaledVelocity);
            });*/
             engine.wasm.testTriangles(
                this.collider_faces_pointer,
                this.collider_planes_parallel_pointer,
                this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT, //  plane + vector pointers
                //@ts-expect-error wasm-bindgen
                this.id);
        
    }
    protected buildFaces() {
        if (this.faces_count % 4 === 0) {
            this.#faceQuatros.length=0;
            let faceQuatro: Triangle[] = [];
            this.#triangleFaces.forEach(face => {
                if (faceQuatro.push(face) === 4) {
                    this.#faceQuatros.push(faceQuatro as [Triangle, Triangle, Triangle, Triangle])
                    faceQuatro = [];
                }
            });
            this.#updateColliderPlanes();
        }
    }
}

export interface IndexedNode extends MainNode {
    indices_count: number
}

export abstract class BoundableNodeIndexed extends DataNode implements IndexedNode {
    private indicesCount=0;
    get indicesView(): Uint32Array {
        return new Uint32Array(engine.memory.buffer,this.indices_pointer,this.indicesCount);
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
        vertices: Float32Array,
        verticesPositionStride = 3,
        indicesView: Uint32Array,
        has_physic = false,
        strip = false,
        point_light = 0,
        static_faces = false,
        label:string,
        scenes?: Scene[],
    ) {
        super(vertices.length/verticesPositionStride,verticesPositionStride, has_physic, strip, point_light,static_faces,label, scenes);
        Object.getOwnPropertyNames(BoundableNodeIndexed.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(BoundableNodeIndexed.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
        this.indicesView = indicesView;
        this.set_vertices(vertices);
    }
    override set_vertices(vertices:Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if(!this.initCollider())
            return;
      //  if(!facesBufferColliderPointer)
      //      return;
        let vectorsVec4: number[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.indicesView.forEach((indice: number) => {
                const vector = this.colliderVerticesV4[indice];
                if (typeof(vector) === 'undefined') {
                    throw ('position not found');
                }
                if (vectorsVec4.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectorsVec4 as [number, number, number]);
                vectorsVec4 = [(vectorsVec4 as [number, number, number])[1], (vectorsVec4 as [number, number, number])[2]];
            });
        } else {
            this.indicesView.forEach((indice: number) => {
                const position = this.colliderVerticesV4[indice]
                if (typeof(position) === 'undefined') {
                    throw ('position ' + indice + ' not found');
                }
                if (vectorsVec4.push(position!) == 3) {
                    this.addVectors(faceIndex++, vectorsVec4 as [number, number, number])
                    vectorsVec4 = [];
                }
            });
        }
        this.buildFaces();
    }
}
export abstract class BoundableNodeSimple extends DataNode {
    constructor(
        scenes: Scene[],
        vertices:Float32Array,
        verticesPositionStride = 3,
        strip = false,
        label:string
    ) {
        super(vertices.length/verticesPositionStride,verticesPositionStride, false, strip,  undefined, undefined, label, scenes);
        Object.getOwnPropertyNames(BoundableNodeSimple.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(BoundableNodeSimple.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        })
        this.set_vertices(vertices);
    }
    override set_vertices(vertices:Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if(!this.initCollider())
            return;


        let vectorsVec4: number[] = [];
        let faceIndex = 0;
        if (this.strip) {
            this.colliderVerticesV4.forEach(vector => {
                if (vectorsVec4.push(vector) < 3)
                    return;
                this.addVectors(faceIndex++, vectorsVec4 as [number, number, number])
                vectorsVec4 = [(vectorsVec4 as [number, number, number])[1], (vectorsVec4 as [number, number, number])[2]];
            });
        } else {
            this.colliderVerticesV4.forEach(vector => {
                if (vectorsVec4.push(vector) == 3) {
                    this.addVectors(faceIndex++, vectorsVec4 as [number, number, number])
                    vectorsVec4 = [];
                }
            });
        }
        this.buildFaces();
    }
}