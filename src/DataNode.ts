import { ObjectWorkerThread } from "./WorkerThread.js";
import { MainNode } from "./MainNode.js";
import { ReadOnlyTerraVector3, TerraMatrix, TerraVector3, TerraVector4, Triangle } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { ColliderJS } from "./Collider.js";
import type { Engine } from "./engine.js";
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

export interface Ellipsoid {
    collisionsScalingMatrix: TerraMatrix;
    radius: {
        0: number;
        1: number;
        2: number;
    }
    readonly closeDistanceVector:[number,number,number]
}

/*
    TODO: Calculate closeDistance on every collision to take account angle between upVector and collided slope,
    so it is always small enought for gravity to hit on next tick.
*/

export const closeDistance = 0.0022
export const closeDistanceSquared = closeDistance*closeDistance
export abstract class DataNode extends MainNode implements Ellipsoid {
    //TODO: this is a sphere collider
    radius: { 0: number; 1: number; 2: number; };
    readonly #radius: [x: number, y: number, z: number] = [1, 1, 1]
    readonly collisionsScalingMatrix:TerraMatrix = new TerraMatrix([
        1.0 / this.#radius[0],   0.0,                   0.0,                    0.0,
        0.0,                     1.0 / this.#radius[1], 0.0,                    0.0,
        0.0,                     0.0,                   1.0 / this.#radius[2],  0.0,
        0.0, 0.0, 0.0, 1.0]);
    readonly closeDistanceVector:[number,number,number] = [closeDistance / this.#radius[0], closeDistance / this.#radius[1], closeDistance / this.#radius[2]];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    checkCollide(_velocityPerDelta:[number,number,number]):ReadOnlyTerraVector3 {
        return this.translation;
        // TODO: Generic collision check, object shape is not known
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onCollide() {
    }
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
        return new Float32Array(engine.memory.buffer, engine.rust.vertices_pointer(this.ptr), this.vertices_count * this.vertices_stride);
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

        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        if(has_physic)
            engine.physics.tickables.push(this);


        const radius = this.#radius
        const collisionsScalingMatrix = this.collisionsScalingMatrix;
        const myCloseDistance = this.closeDistanceVector;
        this.radius = {
            get 0() {
                return radius[0]
            },
            get 1() {
                return radius[1]
            },
            get 2() {
                return radius[2]
            },
            set 0(v: number) {
                radius[0] = v;
                collisionsScalingMatrix[0] = 1.0 / v;
                myCloseDistance[0] = closeDistance / v

            },
            set 1(v: number) {
                radius[1] = v;
                collisionsScalingMatrix[5] = 1.0 / v;
                myCloseDistance[1] = closeDistance / v
            },
            set 2(v: number) {
                radius[2] = v;
                collisionsScalingMatrix[10] = 1.0 / v;
                myCloseDistance[2] = closeDistance / v
            }
        }
    }
    get verticesArray() {
        const arr:Float32Array[] = [];
        const vertices_pointer=engine.rust.vertices_pointer(this.ptr);
        for (let i=0; i< this.vertices_count; i++) {
            arr.push(new Float32Array(engine.memory.buffer,
                                        vertices_pointer + i*Float32Array.BYTES_PER_ELEMENT*this.vertices_stride,
                                        this.vertices_stride))
        }
        return arr;
    }
    override destroy() {
        let idx = engine.physics.tickables.indexOf(this);
        // TODO: save index to property
        if(idx>=0) {
            engine.physics.tickables.splice(idx,1);
        }
        idx = engine.physics.movables.indexOf(this);
        if(idx) {
            engine.physics.movables.splice(idx,1);
        }
        super.destroy()
    }
    initCollider() {
        //TODO: Calculate on demand
        if(this.faces_count === 0 || this.vertices_count===0)
            return false;
        this.#positionsAndCollider.length=0;
        this.colliderVerticesV4.length=0;
        //this.lastColliderWorldVectorsPointer = this.engine.mallocView(this.positions_count * 4 * Float32Array.BYTES_PER_ELEMENT);
        const vertices_pointer=engine.rust.vertices_pointer(this.ptr);
        for (let i = 0; i < this.vertices_count; i++) {
            const pos = vertices_pointer + i * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT;
            const colPos = this.last_collider_world_vertices_pointer + i * 4 * Float32Array.BYTES_PER_ELEMENT;
            this.colliderVerticesV4.push(colPos);
            this.#positionsAndCollider.push([pos, colPos])
        }
        //return this.facesBufferColliderPointer.byteOffset;
        return true;
    }
    addVectors = (faceIndex: number, vectors: [pointerToVec4:number, pointerToVec4:number, pointerToVec4:number] ) => {
        if (vectors.length != 3)
            throw ('less than 3 vector');
        const collider_faces_pointer = engine.rust.collider_faces_pointer(this.ptr); 
        this.#triangleFaces[faceIndex] = new Triangle(
            vectors,
            () => collider_faces_pointer + faceIndex * 4 * 7);
       /* new Triangle(
            vectors,
            new Float32Array(this.engine.memory.buffer, this.collider_faces_pointer + faceIndex * 4 * 7,4) as TerraVector4
        );*/
        new Uint32Array(
            engine.memory.buffer,
            collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
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
        return new TerraVector3(engine.memory.buffer, engine.rust.vertices_pointer(this.ptr) + index * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT);
    }
    intersectsRay = (ray: Float32Array): Promise<void> => {
        return worker.message(this.id, 'intersectsRay', [ray.buffer]);
    }
    #updateColliderPlanes() {
        this.#positionsAndCollider.forEach((posAndCol, i) => {
            this.getPosition(i).multiply2Ref(this.#myCollisionsTransformMatrix, new TerraVector4(engine.memory.buffer,posAndCol[1]));
        });
        const collider_planes_parallel_pointer=engine.rust.collider_planes_parallel_pointer(this.ptr);
        this.#faceQuatros.forEach((quatro, i) => {
            quatro[0].updatePlane();
            quatro[1].updatePlane();
            quatro[2].updatePlane();
            quatro[3].updatePlane();
            new Float32Array(engine.memory.buffer, collider_planes_parallel_pointer + i * 4 * 16, 16).set([
                quatro[0].planeCollider[0], quatro[1].planeCollider[0], quatro[2].planeCollider[0], quatro[3].planeCollider[0], //x
                quatro[0].planeCollider[1], quatro[1].planeCollider[1], quatro[2].planeCollider[1], quatro[3].planeCollider[1], //y
                quatro[0].planeCollider[2], quatro[1].planeCollider[2], quatro[2].planeCollider[2], quatro[3].planeCollider[2], //z
                quatro[0].planeCollider[3], quatro[1].planeCollider[3], quatro[2].planeCollider[3], quatro[3].planeCollider[3], //d
            ]);
        });
    }
    //collisionsScalingMatrix = new TerraMatrix();
    #myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision (collider: ColliderJS, sphere: Ellipsoid, debug?:number) {
        if (this.faces_count % 4 != 0) {  //TODO
            console.warn('Checking collision on mesh that does not have right amount of faces')
            return
        }
        //console.log(this.label, this.bounding_min, this.bounding_max)
        if (!collider._canDoCollision(this.bounding_min, this.bounding_max, sphere)) {
            return;
        }
        //console.log('collisionsScalingMatrix',collisionsScalingMatrix)
        // TODO: keep colliderplanes in memory for x amount of collisionsScalingMatrix 
        this.get_transformation().multiplyToRef(sphere.collisionsScalingMatrix, this.#myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.#myCollisionsTransformMatrix)) {
            this.#lastColliderTransformMatrix = this.#myCollisionsTransformMatrix.clone();
            this.#updateColliderPlanes();
        }
        //@ts-ignore
            // eslint-disable-next-line no-constant-condition
           
        const scaledPosition=collider.scaledPosition;
        const scaledVelocity=collider.scaledVelocity
        const trLength=this.#triangleFaces.length;
        //console.log('faces',this.#faceQuatros)
        for(let i=0; i<trLength; i++) {
            collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity, debug);
        }
/*
        TODO: Use wasm when this.faces_count % 4 == 0
        engine.wasm.testTriangles(
            engine.rust.collider_faces_pointer(this.ptr),
            engine.rust.collider_planes_parallel_pointer(this.ptr),
            this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT, //  plane + vector pointers
            this.id);*/
             
        
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
    indices_count=0;
    set indices(indices:Uint32Array) {
        this.indices_count=indices.length;
        const ptr = engine.rust.alloc_vector_usize(indices.length);
        new Uint32Array(engine.rust.memory.buffer,ptr,indices.length).set(indices);
        engine.rust.set_indices(this.ptr, ptr, indices.length);
        this.rebuildTrianglePlanes();
    }
    get indices() {
        const ptr = engine.rust.indices_pointer(this.ptr);
        return new Uint32Array(engine.rust.memory.buffer, ptr, this.indices_count);
    }

/*    set setFaces(faces:Float32Array) {
        this.faces=faces;
        this.rebuildTrianglePlanes();
    }*/
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

        this.indices = indicesView;
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
        const indices=this.indices
        if (this.strip) {
            indices.forEach((indice: number) => {
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
            indices.forEach((indice: number) => {
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
        vertices:Float32Array,
        verticesPositionStride = 3,
        strip = false,
        label:string,
        scenes?: Scene[],
    ) {
        super(vertices.length/verticesPositionStride,verticesPositionStride, false, strip,  undefined, undefined, label, scenes);
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