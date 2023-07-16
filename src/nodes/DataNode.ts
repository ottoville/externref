import { ObjectWorkerThread } from '../WorkerThread.js';
import { MainNode } from '../MainNode.js';
import { MutableTerraVector3, ReadOnlyFloat32Array, TerraMatrix, TerraVector3, TerraVector4, Triangle } from '../Math.js';
import type { ColliderJS } from '../Collider.js';
import type { Engine, rust_pointer, rust_vec_ptr } from '../engine.js';
declare const engine: Engine;

const worker = new ObjectWorkerThread('mesh.js',
    {
        type: 'module',
    });
export interface canCollideCharacter {
    rebuildTrianglePlanes(): void
}
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: DataNode,
    distance: number
}
class pickInfo {
    buffer = new SharedArrayBuffer(6 * 4);
    point = new MutableTerraVector3(this.buffer);
    #distance = new DataView(this.buffer,
        3 * 4,
        4);
    getDistance() {
        return this.#distance.getFloat32(0,
            true);
    }
}

export interface Ellipsoid {
    collisionsScalingMatrix: TerraMatrix;
    radius: {
        0: number;
        1: number;
        2: number;
    }
    readonly closeDistanceVector: [number, number, number]
}

export type DataNodeProps = {
    vertices: {
        view: rust_vec_ptr<'f32'>,
        stride: number
    }
    /**
     * Setting true will create collider in rapier
     */
    can_collide?: boolean;
    static_faces?: boolean;
    frontFace?: GPUFrontFace;
    character_can_collide_to?: boolean;
};
/*
    TODO: Calculate closeDistance on every collision to take account angle between upVector and collided slope,
    so it is always small enought for gravity to hit on next tick.
*/

export function allocate_vec_f32(length: number) {
    const vec_ptr = engine.rust.alloc_vector_f32(length);
    return Array.from(new Uint32Array(engine.rust.memory.buffer,
        vec_ptr,
        3)) as unknown as  rust_vec_ptr<'f32'>;
}

export function allocate_vec(array: Uint32Array) : rust_vec_ptr<'usize'>
export function allocate_vec(array: Float32Array) : rust_vec_ptr<'f32'>
export function allocate_vec(array: Uint32Array | Float32Array): readonly [ptr: rust_pointer<'usize'> | rust_pointer<'f32'>, len: number, cap: number] {
    if(array.buffer.byteLength === 0) {
        throw new Error('Cannot allocate deattached or empty buffer');
    }
    if (array.buffer === engine.rust.memory.buffer) {
        throw new Error('Source buffer is already in rust');
    }
    if(array instanceof Float32Array) {
        const ptr = allocate_vec_f32(array.length);
        new Float32Array(engine.rust.memory.buffer,
            ptr[0],
            ptr[1]).set(array);
        return ptr;
    }
    else {
        const vec_ptr = engine.rust.alloc_vector_usize(array.length);
        const [
            ptr,
            len,
            cap
        ] = new Uint32Array(engine.rust.memory.buffer,
            vec_ptr,
            3);
        new Uint32Array(engine.rust.memory.buffer,
            ptr,
            len).set(array);
        return [
ptr as rust_pointer<'usize'>,
len!,
cap!
        ];
    }
}

export const closeDistance = 0.0022;
export const closeDistanceSquared = closeDistance * closeDistance;
export abstract class DataNode extends MainNode {
    onVerticesChangeListeners: (() => void)[] = [];
    onVerticesChange() {
        this.onVerticesChangeListeners.forEach(cb => {
            cb();
        });
    }

    // TODO: collide or uncollide with ANY mesh will change this value, so its lot of broken and does not indicate if mesh is really colliding now.
    colliding_physics = false;
    //Used for character
    colliding_character = false;

    #vectorsVec4: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    checkCollide(_velocityPerDelta: [number, number, number]): TerraVector3 {
        return this.translation;
        // TODO: Generic collision check, object shape is not known
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    onCollideCharacter(_started: boolean) {
    }
    readonly pickInfo = new pickInfo();
    protected readonly colliderVerticesV4: number[] = [];
    readonly #triangleFaces: Triangle[] = [];
    #lastColliderTransformMatrix = new TerraMatrix();

    // facesBufferColliderPointer?: DataView;
    //lastColliderWorldVectorsPointer?: DataView;
    //facesBufferColliderPointerParallel?: DataView;
    #positionsAndCollider: [pointerToVec3: number, pointerToVec4: number][] = [];
    #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];

    get faces_count() {
        return engine.rust.faces_count(this.id);
    }
    set faces(faces: Float32Array) {
        const vec_ptr = engine.rust.alloc_vector_f32(faces.length);
        const [
            ptr,
            len,
            cap
        ] = new Uint32Array(engine.rust.memory.buffer,
            vec_ptr,
            3);

        new Float32Array(engine.rust.memory.buffer,
            ptr,
            len).set(faces);
        engine.rust.set_faces(this.id,
ptr!,
len!,
cap!);
    }
    /**
     * Get raw vertices data
     */
    get vertices() {
        return new ReadOnlyFloat32Array(engine.memory.buffer,
            engine.rust.vertices_pointer(this.id),
            this.vertices_count * this.vertices_stride);
    }
    get vertices_count() {
        return engine.rust.vertices_count(this.id);
    }
    get vertices_stride(): number {
        return engine.rust.vertices_stride(this.id);
    }
    /**
     *  Set new vertices raw array for the mesh
     * @param vec
     */
    set_vertices(vec: rust_vec_ptr<'f32'>) {
        engine.rust.set_vertices(this.id,
            ...vec);
        this.onVerticesChange();
    }
    /**
     * Update existing vertices
     * @param cb Callback which gets the vertices array as argument
     */
    update_vertices(cb: (view: Float32Array) => void) {
        const view = new Float32Array(engine.memory.buffer,
            engine.rust.vertices_pointer(this.id),
            this.vertices_count * this.vertices_stride);
        cb(view);
        this.onVerticesChange();
    }
    get last_collider_world_vertices_pointer() {
        return engine.rust.last_collider_world_vertices_pointer(this.id);
    }
    create_collider() {
        return engine.rust.create_trimesh_collider(this.id);
    }
    static override Meshes: Map<number, DataNode> = new Map();
    static CharacterCanCollideMeshes: Set<DataNode> = new Set();
    #frontFace: GPUFrontFace;
    #character_can_collide_to: boolean;
    constructor(
        {
            vertices,
            can_collide = false,
            static_faces = false,
            frontFace = 'cw',
            character_can_collide_to = true,
        }: DataNodeProps,
        mesh_id: number,
        strip = false
    ) {
        super(mesh_id);
        this.#frontFace = frontFace;
        this.#character_can_collide_to = character_can_collide_to;

        DataNode.Meshes.set(this.id,
            this);
        engine.rust.create_geometry(this.id,
            true,
            vertices.stride,
            static_faces,
            strip);
        this.set_vertices(vertices.view);
        // queueMicrotask here so mesh will have indices initialized
        if (can_collide) {
            queueMicrotask(() => {
                const collider_ptr = this.create_collider();
                engine.rust.add_collider(this.id,
                    collider_ptr);
            });
        }
        if (character_can_collide_to) {
            DataNode.CharacterCanCollideMeshes.add(this);
        }
    }
    protected pushVertice = (position: number) => {
        let newLen = 0;
        if (this.#frontFace === 'ccw') {
            newLen = this.#vectorsVec4.unshift(position);
        } else {
            newLen = this.#vectorsVec4.push(position);
        }
        if (newLen === 3) {
            const collider_faces_pointer = engine.rust.collider_faces_pointer(this.id);
            const faceIndex = this.#triangleFaces.length;
            this.#triangleFaces.push(new Triangle(
                this.#vectorsVec4 as [number, number, number],
                collider_faces_pointer + faceIndex * 4 * 7 as rust_pointer<'Plane'>)); // ColliderPlane size is 7
            new Uint32Array(
                engine.memory.buffer,
                collider_faces_pointer + faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 + 4 * Float32Array.BYTES_PER_ELEMENT,
                3).set(this.#vectorsVec4); //4 is from plane

            if (this.strip) {
                this.#vectorsVec4 = [
                    (this.#vectorsVec4 as [number, number, number])[1],
                    (this.#vectorsVec4 as [number, number, number])[2]
                ];
            } else {
                this.#vectorsVec4 = [];
            }
        }
    };
    get verticesArray() {
        const arr: Float32Array[] = [];
        const vertices_pointer = engine.rust.vertices_pointer(this.id);
        for (let i = 0; i < this.vertices_count; i++) {
            arr.push(new Float32Array(engine.memory.buffer,
                vertices_pointer + i * Float32Array.BYTES_PER_ELEMENT * this.vertices_stride,
                this.vertices_stride));
        }
        return arr;
    }
    override destroy() {
        let idx = engine.physics.tickables.indexOf(this);
        // TODO: save index to property
        if (idx >= 0) {
            engine.physics.tickables.splice(idx,
                1);
        }
        idx = engine.physics.movables.indexOf(this);
        if (idx) {
            engine.physics.movables.splice(idx,
                1);
        }
        DataNode.Meshes.delete(this.id);
        DataNode.CharacterCanCollideMeshes.delete(this);
        super.destroy();
    }
    initCollider() {
        if (!this.#character_can_collide_to)
            return false;
        //TODO: Calculate on demand
        if (this.faces_count === 0 || this.vertices_count === 0)
            return false;
        this.#triangleFaces.length = 0;
        this.#vectorsVec4 = [];
        this.#positionsAndCollider.length = 0;
        this.colliderVerticesV4.length = 0;
        //this.lastColliderWorldVectorsPointer = this.engine.mallocView(this.positions_count * 4 * Float32Array.BYTES_PER_ELEMENT);
        const vertices_pointer = engine.rust.vertices_pointer(this.id);
        for (let i = 0; i < this.vertices_count; i++) {
            const pos = vertices_pointer + i * this.vertices_stride * Float32Array.BYTES_PER_ELEMENT;
            const colPos = this.last_collider_world_vertices_pointer + i * 4 * Float32Array.BYTES_PER_ELEMENT;
            this.colliderVerticesV4.push(colPos);
            this.#positionsAndCollider.push([
                pos,
                colPos
            ]);
        }
        //return this.facesBufferColliderPointer.byteOffset;
        return true;
    }

    intersectsRay = (ray: Float32Array): Promise<void> => {
        return worker.message(this.id,
            'intersectsRay',
            [ray.buffer]);
    };
    #updateColliderPlanes() {
        this.#positionsAndCollider.forEach((posAndCol, i) => {
            if (i > this.positions_count) {
                throw new Error('Tried to access vertice out of boundary');
            }
            new MutableTerraVector3(engine.memory.buffer,
                posAndCol[0]).multiply2Ref(this.#myCollisionsTransformMatrix,
                new TerraVector4(engine.memory.buffer,
                    posAndCol[1]));
        });
        const collider_planes_parallel_pointer = engine.rust.collider_planes_parallel_pointer(this.id);
        this.#triangleFaces.forEach(face => {
            face.updatePlane();
        });

        this.#faceQuatros.forEach((quatro, i) => {
            new Float32Array(engine.memory.buffer,
                collider_planes_parallel_pointer + i * 4 * 16,
                16).set([
                quatro[0].planeCollider[0],
                quatro[1].planeCollider[0],
                quatro[2].planeCollider[0],
                quatro[3].planeCollider[0], //x
                quatro[0].planeCollider[1],
                quatro[1].planeCollider[1],
                quatro[2].planeCollider[1],
                quatro[3].planeCollider[1], //y
                quatro[0].planeCollider[2],
                quatro[1].planeCollider[2],
                quatro[2].planeCollider[2],
                quatro[3].planeCollider[2], //z
                quatro[0].planeCollider[3],
                quatro[1].planeCollider[3],
                quatro[2].planeCollider[3],
                quatro[3].planeCollider[3] //d
            ]);
        });
    }
    //collisionsScalingMatrix = new TerraMatrix();
    #myCollisionsTransformMatrix = new TerraMatrix();
    public checkCollision(_collider: ColliderJS, sphere: Ellipsoid) {
        //TODO: When there is support for bounding sphere.
        //  var distance = Vector3.Distance(Vector3.FromArray(this._basePointWorld), sphereCenter);

        var max = Math.max(sphere.radius[0],
            sphere.radius[1],
            sphere.radius[2]);

        /*   if (distance > this._velocityWorldLength + max + sphereRadius) {
               return false;
           }*/
        if (!this.intersect_box_aa_sphere(engine.collider,
            max)) {
            return;
        }
        // TODO: keep colliderplanes in memory for x amount of collisionsScalingMatrix
        this.get_transformation().multiplyToRef(sphere.collisionsScalingMatrix,
            this.#myCollisionsTransformMatrix);
        if (!this.#lastColliderTransformMatrix.equals(this.#myCollisionsTransformMatrix)) {
            this.#lastColliderTransformMatrix = this.#myCollisionsTransformMatrix.clone();
            this.#updateColliderPlanes();
        }
        //@ts-ignore
        // eslint-disable-next-line no-constant-condition


        if (this.faces_count % 4 != 0) {
            /* const scaledPosition=collider.scaledPosition;
             const scaledVelocity=collider.scaledVelocity
             const trLength=this.#triangleFaces.length;
             for(let i=0; i<trLength; i++) {
                 collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
             }*/
            /*   const scaledPosition=collider.scaledPosition;
               const scaledVelocity=collider.scaledVelocity
               const trLength=this.#triangleFaces.length;
               for(let i=0; i<trLength; i++) {
                   collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
               }*/
        } else {

            //   TODO: Use wasm when this.faces_count % 4 == 0
            engine.wasm.testTriangles(
                engine.rust.collider_faces_pointer(this.id),
                engine.rust.collider_planes_parallel_pointer(this.id),
                this.faces_count * 7 * Float32Array.BYTES_PER_ELEMENT, //  plane + vector pointers
                this.id);
            /*
           const scaledPosition=collider.scaledPosition;
           const scaledVelocity=collider.scaledVelocity
           const trLength=this.#triangleFaces.length;
           for(let i=0; i<trLength; i++) {
               collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
           }*/
        }
    }
    protected buildFaces() {
        if (this.faces_count % 4 === 0) {
            this.#faceQuatros.length = 0;
            let faceQuatro: Triangle[] = [];
            this.#triangleFaces.forEach(face => {
                if (faceQuatro.push(face) === 4) {
                    this.#faceQuatros.push(faceQuatro as [Triangle, Triangle, Triangle, Triangle]);
                    faceQuatro = [];
                }
            });
        }
        this.#updateColliderPlanes();
    }
}
