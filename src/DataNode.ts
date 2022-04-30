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

    #vectorsVec4: number[] = [];
    override update_scale(x: number, y: number, z: number) {
        this.radius[0]=x;
        this.radius[1]=y;
        this.radius[2]=z;
        super.update_scale(x,y,z)
    }
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
    get vertices_count() {
        return engine.rust.vertices_count(this.ptr);
    }
    
    get faces_count() {
        return engine.rust.faces_count(this.ptr);
    }
    set faces(faces:Float32Array)  {
        const ptr = engine.rust.alloc_vector_f32(faces.length);
        new Float32Array(engine.rust.memory.buffer,ptr,faces.length).set(faces);
        engine.rust.set_faces(this.ptr, ptr, faces.length);
    }
    get vertices_stride(): number{
        return engine.rust.vertices_stride(this.ptr);
    }
    set_vertices(vertices: Float32Array) {
        const ptr = engine.rust.alloc_vector_f32(vertices.length);
        new Float32Array(engine.rust.memory.buffer,ptr,vertices.length).set(vertices);
        engine.rust.set_vertices(this.ptr, ptr, vertices.length);
    }
    get last_collider_world_vertices_pointer() {
        return engine.rust.last_collider_world_vertices_pointer(this.ptr);
    }
    create_collider() {
        return engine.rust.create_ball_collider();
    }
    constructor(
        vertices: Float32Array,
        verticesPositionStride: number,
        has_physic = false,
        strip = false,
        point_light = 0,
        static_faces = false,
        label:string,
        scenes?: Scene[],
        protected frontFace: GPUFrontFace = 'cw',
        fixed = false,
        rigid_body = true
    ) {
        super(vertices.length/verticesPositionStride, point_light, undefined, strip, label, scenes, fixed, rigid_body);
        engine.rust.add_geometry(this.ptr,true,verticesPositionStride,static_faces,strip);
        this.set_vertices(vertices);
        // queueMicrotask here so mesh will have indices initialized
        queueMicrotask(() => {
            const collider_ptr = this.create_collider();
            engine.rust.add_collider(this.ptr, collider_ptr)
        });
        

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
    protected pushVertice = (position:number) => {
        let newLen=0;
        if(this.frontFace === 'ccw') {
            newLen=this.#vectorsVec4.unshift(position)
        } else {
            newLen=this.#vectorsVec4.push(position)
        }
        if (newLen === 3) {
            const collider_faces_pointer = engine.rust.collider_faces_pointer(this.ptr); 
            const faceIndex = this.#triangleFaces.length;
            this.#triangleFaces.push(new Triangle(
                this.#vectorsVec4  as [number, number, number],
                () => collider_faces_pointer + faceIndex * 4 * 7));
            new Uint32Array(
                engine.memory.buffer,
                collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
                3).set(this.#vectorsVec4); //4 is from plane
        
            if(this.strip) {
                this.#vectorsVec4 = [(this.#vectorsVec4 as [number, number, number])[1], (this.#vectorsVec4 as [number, number, number])[2]];
            } else {
                this.#vectorsVec4 = [];
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
        this.#triangleFaces.length=0;
        this.#vectorsVec4=[]
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
        this.#triangleFaces.forEach(face => {
            face.updatePlane();
        })
        this.#faceQuatros.forEach((quatro, i) => {
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
    public checkCollision (collider: ColliderJS, sphere: Ellipsoid) {

        //TODO: When there is support for bounding sphere.
        //  var distance = Vector3.Distance(Vector3.FromArray(this._basePointWorld), sphereCenter);

        var max = Math.max(sphere.radius[0], sphere.radius[1], sphere.radius[2]);

        /*   if (distance > this._velocityWorldLength + max + sphereRadius) {
               return false;
           }*/
        if(!this.intersect_box_aa_sphere(engine.collider,max)) {
            return;
        }
        // TODO: keep colliderplanes in memory for x amount of collisionsScalingMatrix 
        this.get_transformation().multiplyToRef(sphere.collisionsScalingMatrix, this.#myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.#myCollisionsTransformMatrix)) {
            this.#lastColliderTransformMatrix = this.#myCollisionsTransformMatrix.clone();
            this.#updateColliderPlanes();
        }
        //@ts-ignore
            // eslint-disable-next-line no-constant-condition
           

            if (this.faces_count % 4 != 0) {
                const scaledPosition=collider.scaledPosition;
                const scaledVelocity=collider.scaledVelocity
                const trLength=this.#triangleFaces.length;
                for(let i=0; i<trLength; i++) {
                    collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
                }
            } else {
                /*
        TODO: Use wasm when this.faces_count % 4 == 0
        engine.wasm.testTriangles(
            engine.rust.collider_faces_pointer(this.ptr),
            engine.rust.collider_planes_parallel_pointer(this.ptr),
            this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT, //  plane + vector pointers
            this.id);*/
                const scaledPosition=collider.scaledPosition;
                const scaledVelocity=collider.scaledVelocity
                const trLength=this.#triangleFaces.length;
                for(let i=0; i<trLength; i++) {
                    collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
                }
            }


             
        
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
        }
        this.#updateColliderPlanes();
    }
}

export interface IndexedNode extends MainNode {
    indices_count?: number //This property is optional because it is invoked on constructor when class is not fully initialized
}

export abstract class BoundableNodeIndexed extends DataNode implements IndexedNode {
    indices_count?=0;
    set_indices_and_vertices(indices:Uint32Array, vertices:Float32Array) {
        this.indices_count=indices.length;
        const ptr = engine.rust.alloc_vector_usize(indices.length);
        new Uint32Array(engine.rust.memory.buffer,ptr,indices.length).set(indices);

        const ptr_vertices = engine.rust.alloc_vector_f32(vertices.length);
        new Float32Array(engine.rust.memory.buffer,ptr_vertices,vertices.length).set(vertices);

        engine.rust.set_indices_and_vertices(this.ptr, ptr, indices.length, ptr_vertices, vertices.length);
        this.rebuildTrianglePlanes();
    }
    get indices() {
        const ptr = engine.rust.indices_pointer(this.ptr);
        return new Uint32Array(engine.rust.memory.buffer, ptr, this.indices_count ?? 0);
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
        frontFace: GPUFrontFace = 'cw',
        fixed = false,
        rigid_body = true
    ) {
        super(vertices, verticesPositionStride, has_physic, strip, point_light, static_faces, label, scenes, frontFace, fixed, rigid_body);
        this.set_indices_and_vertices(indicesView, vertices);
    }
    override set_vertices(vertices:Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if(!this.initCollider())
            return;
        this.indices.forEach((indice: number) => {
            const position = this.colliderVerticesV4[indice]
            if (typeof(position) === 'undefined') {
                throw ('position ' + indice + ' not found');
            }
            this.pushVertice(position)
        });
        this.buildFaces();
    }
}
export abstract class BoundableNodeSimple extends DataNode {
    constructor(
        vertices:Float32Array,
        verticesPositionStride = 3,
        strip = false,
        label:string,
        has_physic: boolean,
        scenes?: Scene[],
    ) {
        super(vertices, verticesPositionStride, has_physic, strip,  undefined, undefined, label, scenes,undefined);
    }
    override set_vertices(vertices:Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if(!this.initCollider())
            return;
        this.colliderVerticesV4.forEach(this.pushVertice);
        this.buildFaces();
    }
}