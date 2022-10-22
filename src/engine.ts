import { Physics } from "./physics.js";
import { GPU } from "./GPU.js";
import { ColliderJS } from "./Collider.js";
import type { Scene } from "./Scene.js";
import type { TerraVector3 } from "./Math.js";
import { TerraCamera } from "./TerraCamera.js";
import { Projection } from "./GPU/Projection.js";
//@ts-ignore
import { ArcRotateCamera } from "./controllers/ArcRotateCamera.js";
//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import { closeDistance, closeDistanceSquared, DataNode, Ellipsoid } from "./nodes/DataNode.js";
import type { CameraController } from "./controllers/CameraController.js";

function createError(e: unknown) {
    if (!(e instanceof Error)) {
        return new Error('Unknown error ' + e);
    }
    return e;
}

declare const engine: Engine;
//@ts-ignore
globalThis.fps = 0;
export type rust_pointer<T> = {
    __brand: T
} & number

/*
globalThis.addEventListener && globalThis.addEventListener('unhandledrejection', (e) => {
    console.log(e)
    console.error('unhandledrejection');
    debugger;
})
*/
export type rustWasm = {
    GPUMeshes(): rust_pointer<"GPUMeshes">,

    collider(): rust_pointer<"legacy_collider">,
    intersection_point_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collision_resolved_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    nearest_distance_squared_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    set_nearest_distance_squared(collider_ptr: rust_pointer<"legacy_collider">, distance: number): void
    get_nearest_distance_squared(collider_ptr: rust_pointer<"legacy_collider">): number
    scaled_position_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    scaled_velocity_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collided_mesh_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collided_point_in_triangle_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    set_speed(collider_ptr: rust_pointer<"legacy_collider">, speed: number): void
    basepoint_world_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    renderloop(): void,

    new_mesh(id: number,
        positions_count: number,
        point_light: number,
        directional_light: number,
        scenes: number,
        strip: boolean,
        fixed: boolean,
        rigid_body: boolean,
        label: rust_pointer<"u8">): rust_pointer<"mesh">,
    add_geometry(mesh: rust_pointer<"mesh">,
        has_bounding: boolean,
        vertices_stride: number,
        static_faces: boolean,
        strip: boolean): void,
    add_collider(mesh: rust_pointer<"mesh">,
        collider: rust_pointer<"collider">): void
    memory: WebAssembly.Memory,
    set_vertices(mesh: rust_pointer<"mesh">, ptr: rust_pointer<"f32">, length: number): void,
    set_indices_and_vertices(mesh: rust_pointer<"mesh">, indices: rust_pointer<"usize">, indices_length: number, vertices: rust_pointer<"f32">, vertices_length: number): void,
    vertices_pointer(mesh: rust_pointer<"mesh">): number,
    indices_pointer(mesh: rust_pointer<"mesh">): number,
    last_collider_world_vertices_pointer(mesh: rust_pointer<"mesh">): number,
    vertices_count(mesh: rust_pointer<"mesh">): number,
    faces_count(mesh: rust_pointer<"mesh">): number,
    alloc_vector_f32(size: number): rust_pointer<"f32">,
    alloc_vector_usize(size: number): rust_pointer<"usize">,
    alloc_string(size: number): rust_pointer<"u8">,
    update_scale(mesh: rust_pointer<"mesh">, x: number, y: number, z: number): void,
    update_rotation(mesh: rust_pointer<"mesh">, x: number, y: number, z: number, w: number): void,
    update_euler_angles(mesh: rust_pointer<"mesh">, x: number, y: number, z: number): void,
    update_translation(mesh: rust_pointer<"mesh">, x: number, y: number, z: number): void,
    apply_impulse(mesh: rust_pointer<"mesh">, x: number, y: number, z: number): void,
    update_dynamic_buffer(mesh: rust_pointer<"mesh">): void,
    gpu_alignment(mesh: rust_pointer<"mesh">): number,
    positions_count(mesh: rust_pointer<"mesh">): number,
    id(mesh: rust_pointer<"mesh">): number,
    strip(mesh: rust_pointer<"mesh">): number,
    collider_planes_parallel_pointer(mesh: rust_pointer<"mesh">): rust_pointer<"collider_planes_parallel_pointer">,
    gpu_pointer(mesh: rust_pointer<"mesh">): number,
    translation_pointer(mesh: rust_pointer<"mesh">): number,
    velocity_pointer(mesh: rust_pointer<"mesh">): number,
    intersect_box_aa_sphere(mesh: rust_pointer<"mesh">, collider_ptr: number, radius: number): boolean
    scale_x(mesh: rust_pointer<"mesh">): number,
    scale_y(mesh: rust_pointer<"mesh">): number,
    scale_z(mesh: rust_pointer<"mesh">): number,
    vertices_stride(mesh: rust_pointer<"mesh">): number,
    set_faces(mesh: rust_pointer<"mesh">, ptr: number, length: number): void,
    set_color(mesh: rust_pointer<"mesh">, d0: number, d1: number, d2: number, d3: number): void,
    set_ambient(mesh: rust_pointer<"mesh">, r: number, g: number, b: number): void
    set_shadow(mesh: rust_pointer<"mesh">, shadow: number): void
    collider_faces_pointer(mesh: rust_pointer<"mesh">): rust_pointer<'collider_faces'>,
    set_scenes(mesh: rust_pointer<"mesh">, scenes: number): void,
    update_scale_and_rotation(mesh: rust_pointer<"mesh">, x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number): void
    faces_pointer(mesh: rust_pointer<"mesh">): number,
    bounding_vectors_pointer_simd(mesh: rust_pointer<"mesh">): number,

    create_elevator(mesh: rust_pointer<"mesh">): rust_pointer<"elevator">,
    mouse_position_pointer(elevator_ptr: rust_pointer<"elevator">): number
    elevate(elevator_ptr: rust_pointer<"elevator">, mesh: rust_pointer<"mesh">, radius: number, height: number): void
    get_length(elevator_ptr: rust_pointer<"elevator">): number
    get_offset(elevator_ptr: rust_pointer<"elevator">): number

    init_engine2(): number
    physic_tick(): void

    create_ball_collider(radius: number): rust_pointer<"collider">
    create_capsule_collider(half_height: number, radius: number, orientation: 0 | 1 | 2, collision_events: boolean): rust_pointer<"collider">,
    create_trimesh_collider(mesh: rust_pointer<"mesh">): rust_pointer<"collider">
    create_convex_hull_collider(mesh: rust_pointer<"mesh">): rust_pointer<"collider">
    create_cuboid_collider(hx: number, hy: number, hz: number, border_radius: number, collision_events: boolean): rust_pointer<"collider">
    create_cone_collider(half_height: number, radius: number): rust_pointer<"collider">
}

function Dot(left: readonly [number, number, number] | Float32Array | TerraVector3, right: readonly [number, number, number] | Float32Array | TerraVector3): number {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}
const ObjectStores = {
    zones: <ObjStoreDetails>{
        version: 1,
        parameters: { keyPath: "id", autoIncrement: true },
    },
    plantae: <ObjStoreDetails>{
        version: 2,
        parameters: { keyPath: "id", autoIncrement: true },
        indices: [
            { version: 3, name: 'family', keyPath: 'family', options: { unique: false } },
            { version: 6, name: 'x', keyPath: 'x', options: { unique: false } },
            { version: 6, name: 'grid', keyPath: 'grid', options: { unique: false } },
            { version: 6, name: 'gridxz', keyPath: ['gridx', 'gridz'], options: { unique: false } },
        ]
    },
    save: <ObjStoreDetails>{
        version: 3,
        parameters: { keyPath: ["type", "name"], autoIncrement: false }
    },
    maps: <ObjStoreDetails>{
        version: 4,
        parameters: { keyPath: "id", autoIncrement: true }
    }
};

type ObjectStore = keyof typeof ObjectStores;
interface EarthTransaction extends IDBTransaction {
    objectStore(name: ObjectStore): IDBObjectStore;
}

interface EarthDatabase extends IDBDatabase {
    transaction<T extends ObjectStore>(storeNames: T, mode?: IDBTransactionMode): EarthTransaction
    transaction<T extends ObjectStore[]>(storeNames: T, mode?: IDBTransactionMode): EarthTransaction
    createObjectStore(name: ObjectStore, optionalParameters?: IDBObjectStoreParameters): IDBObjectStore;
}
export interface ColliderWasm {
    construct(collisionFound: number, intersectionPointer: number, nearestDistanceSquaredPointer: number, collidedMeshPointer: number, velocity: number, basePoint: number, collidedPointInTrianglePointer:number): void;
    memory: WebAssembly.Memory
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: rust_pointer<"collider_faces">, positionParallel: rust_pointer<"collider_planes_parallel_pointer">, length: number, meshID: number) => void
    _initialize: () => void
}
let deviceId=0;
export class Engine {

    /*
        This is the distance that collision response will set the object after collide.
        It is the constraint that keeps objects together. So when force is applied, the collision occurs.
        For gravity (at 60fps) it must be lower than   9.80665*0.016*0.016 = 0,0027240694444442 
        TODO: make other constraints for other forces than gravity
    */

    // registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    readonly physics: Physics;
    readonly scenes: Map<string, Scene> = new Map();
    // readonly collisionNotFound:DataView
    //@ts-ignore
    readonly #collidedMesh: DataView
    readonly collider: ColliderJS;


    readonly #destinationPoint: [number, number, number] = [0, 0, 0];
    readonly #displacementVector: [number, number, number] = [0, 0, 0];

    updateLights = false;
    inputManager: CameraController | null = null

    mainCamera: TerraCamera;
    memory: WebAssembly.Memory;
    GPUReady: Promise<GPU>;
    static async initEngine(
        canvas: HTMLCanvasElement | undefined,
        showError: (e: Error) => void,
        wasmBinaries: { rust: Response | PromiseLike<Response> | BufferSource, collider: Response | PromiseLike<Response> | BufferSource }): Promise<Engine | void> {
        let DB: Promise<EarthDatabase> | undefined = undefined;
        if (typeof (indexedDB) === 'object') {
            DB = new Promise<EarthDatabase>(function (res) {
                var IDB = indexedDB.open("City", 6);
                IDB.onerror = function (e) {
                    showError(createError(e))
                }
                IDB.onupgradeneeded = function (e) {
                    console.log('IDBVersionChangeEvent', e);
                    // Save the IDBDatabase interface 
                    var db: EarthDatabase = this.result;

                    (<(keyof typeof ObjectStores)[]>Object.keys(ObjectStores)).forEach((objstore) => {
                        let createdStore: IDBObjectStore
                        if (ObjectStores[objstore].version > e.oldVersion) {
                            createdStore = db.createObjectStore(objstore, ObjectStores[objstore].parameters);
                        } else {
                            if (!this.transaction)
                                throw (new Error('No transaction'));
                            createdStore = this.transaction.objectStore(objstore);
                        }
                        let indices: ObjStoreIndex[] | undefined;
                        if (indices = ObjectStores[objstore].indices) {
                            indices.forEach((index) => {
                                if (e.oldVersion < index.version) {
                                    createdStore.createIndex(index.name, index.keyPath, index.options);
                                }
                            })
                        }
                    })
                };
                IDB.onsuccess = function () {
                    this.result.onerror = function (e) {
                        console.log(e, ((<IDBRequest>e.target)!).error!.message);
                    }
                    res(this.result);
                }
            })
        }

        let rust: WebAssembly.WebAssemblyInstantiatedSource;
        let colliderWasm: WebAssembly.WebAssemblyInstantiatedSource;
        const exportObj = {
            env: {
                now() {
                    return performance.now()
                },
                jspanic(ptr: number) {
                    if(!(rust.instance.exports.memory instanceof WebAssembly.Memory)) {
                        throw new Error('Webassembly module does not have memory');
                    }
                    console.error(new TextDecoder().decode(new Uint8Array(rust.instance.exports.memory.buffer, ptr, 512)).trimEnd())
                },
                jslog(ptr: number) {
                    if(!(rust.instance.exports.memory instanceof WebAssembly.Memory)) {
                        throw new Error('Webassembly module does not have memory');
                    }
                    console.log(new TextDecoder().decode(new Uint8Array(rust.instance.exports.memory.buffer, ptr, 512)).trimEnd())
                },
                jslog_number(number: number) {
                    console.log(number)
                },
                mesh_on_collide(mesh_id: number, started: boolean) {
                    const mesh = DataNode.Meshes.get(mesh_id);
                    if (mesh) {
                        DataNode.Meshes.get(mesh_id)?.onCollideCharacter(started);
                        mesh.colliding_physics = started;
                    }
                },
                mesh_on_physic_tick(mesh_id: number) {
                    const cb = DataNode.Meshes.get(mesh_id)?.onPhysicTick
                    if (cb) {
                        //TODO: fix delta
                        cb(0)
                    }
                },
                handle_gpu_queue(pointerVec: number, length: number) {
                    engine.gpu?.handle_gpu_queue(pointerVec, length);
                },
                updateAllocatedMemory(allocated_gpu_memory_ptr: number, length: number) {
                    engine.gpu?.updateAllocatedMemory(allocated_gpu_memory_ptr, length);
                },
                update_directional_lights(pointer: number, length: number) {
                    engine.gpu?.update_directional_lights(pointer, length)
                },
                update_point_lights(pointer: number, length: number) {
                    engine.gpu?.update_point_lights(pointer, length)
                }
            }
        }
        let GPUDataSize: number;
        try {
            if (wasmBinaries.rust instanceof ArrayBuffer || ArrayBuffer.isView(wasmBinaries.rust)) {
                rust = await WebAssembly.instantiate(wasmBinaries.rust, exportObj);
            }
            else {
                // rust = await WebAssembly.instantiateStreaming(await fetch('./engine/wasm32-unknown-unknown/debug/engine.wasm'), exportObj);
                rust = await WebAssembly.instantiateStreaming(wasmBinaries.rust, exportObj);
            }
            if (!rust.instance.exports.memory) {
                return showError(new Error('No memory exported'));
            }
            var rustWasm = rust.instance.exports as rustWasm;
            GPUDataSize = rustWasm.init_engine2();
            if (canvas && !window.navigator.gpu) {
                throw (new Error('no webgpu support'));
            }


            const colliderExportObj = {
                console: {
                    log: function (arg: string) {
                        console.log(arg);
                    },
                    error: function (line: number) {
                        console.error('Some error in webassembly on line', line)
                        throw (new Error('Some error in webassembly on line ' + line));
                    }
                },
                env: {
                    memory: rust.instance.exports.memory
                }
            };
            if (wasmBinaries.collider instanceof ArrayBuffer || ArrayBuffer.isView(wasmBinaries.collider)) {
                colliderWasm = await WebAssembly.instantiate(wasmBinaries.collider, colliderExportObj);
            } else {
                colliderWasm = await WebAssembly.instantiateStreaming(wasmBinaries.collider, colliderExportObj);

            }
            //Init rust wasm
        } catch (e) {
            return showError(createError(e));
        }
        const wasm = colliderWasm.instance.exports as unknown as ColliderWasm;
        return new Engine(DB ? await DB : undefined, canvas, wasm, rustWasm, showError, GPUDataSize);
    }
    readonly cameras: Set<TerraCamera> = new Set();

    showError(e: unknown) {
        const error = createError(e);
        if (!error.cause)
            this.showErrorError(error);

    }
    gpu: GPU | undefined
    async createGPU(GPUDataSize: number,cb:(gpu:GPU) => void, adapter: GPUAdapter | null) {
        if(!adapter) {
            // eslint-disable-next-line require-atomic-updates
            adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) {
                console.error('Failed to get adapter, getting fallback adapter');
                // eslint-disable-next-line require-atomic-updates
                adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance', forceFallbackAdapter: true })
            }
            if (!adapter) {
                throw new Error('Cannot get adapter');
            }
        }
        let device: GPUDevice;
        try {
            console.log('getting new device');
            device = await adapter!.requestDevice({label:'device'+(deviceId++)});
        } catch (e) {
            console.error('failed to get new device, getting new adapter');
            let adapter2 = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter2) {
                console.error('Failed to get adapter, getting fallback adapter');
                adapter2 = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance', forceFallbackAdapter: true })
            }
            if (!adapter2) {
                throw new Error('Cannot get adapter');
            }
            console.log('got adapter, getting device')
            try {
                device = await adapter2!.requestDevice({label:'device'+(deviceId++)});
            } catch (ee) {
                console.error(ee);
                throw new Error('Cannot get device');
            }
            // eslint-disable-next-line require-atomic-updates
            adapter = adapter2;

        }
        device.lost.then(reason => {
            console.error('GPU device lost', reason);
            const newGPU=this.createGPU(GPUDataSize,cb, adapter);
            this.gpu!.destroy(newGPU);
            this.gpu = undefined;
            this.GPUReady = newGPU;
        }).catch((ee) => {
            if (ee instanceof Error)
                throw (ee)
            else
                throw (new Error(ee));
        });
        
        const gpu = new GPU(this.canvas!, device, GPUDataSize);
        this.gpu = gpu;
        console.log('new GPU initialized');
        cb(gpu)
        return gpu;

    }
    private pointerMaps = {
        'onceDown': new Map<object, Set<(e: PointerEvent) => void>>(),
        'down': new Map<object, Set<(e: PointerEvent) => void>>(),
        'onceUp': new Map<object, Set<(e: PointerEvent) => void>>(),
        'up': new Map<object, Set<(e: PointerEvent) => void>>(),
        'onceMove': new Map<object, Set<(e: PointerEvent) => void>>(),
        'move': new Map<object, Set<(e: PointerEvent) => void>>()
    } as const;
    /*
        Add listener to canvas element.
         * type: type of listener
         * object: The object which adds the listener, this is used to remove listener when object is destroyed
    */
    addPointerListener(type: keyof typeof engine.pointerMaps, object: object, cb: (e: PointerEvent) => void) {
        const map = this.pointerMaps[type];
        let cbs = map.get(object);
        if(!cbs) {
            cbs = new Set();
            map.set(object, cbs);
        }
        cbs.add(cb);
    }
    removePointerListener(type: keyof typeof engine.pointerMaps, object:object, cb: (e: PointerEvent) => void) {
        const removed = this.pointerMaps[type].get(object)?.delete(cb);
        if(!removed) {
            console.warn('Removed', type, 'listener on',object,'that did not exists');
        }
    }
    clearPointerDownListeners(object: object) {
        Object.values(this.pointerMaps).forEach(map => {
            map.delete(object);
        });
    }
    constructor(
        public DB: EarthDatabase | undefined,
        public canvas: HTMLCanvasElement | undefined,
        public wasm: ColliderWasm,
        public rust: rustWasm,
        public showErrorError: (e: Error) => void,
        GPUDataSize: number,
    ) {
        //@ts-ignore
        globalThis.engine = this;
        this.mainCamera = new TerraCamera();

        if(canvas) {
            canvas.addEventListener('pointerup', (e) => {
                this.pointerMaps.up.forEach(cbs => cbs.forEach(cb => cb(e)))
                this.pointerMaps.onceUp.forEach(cbs => cbs.forEach(cb => cb(e)))
                this.pointerMaps.onceUp.clear();
            });
            canvas.addEventListener('pointerdown', (e) => {
                this.pointerMaps.down.forEach(cbs => cbs.forEach(cb => cb(e)))
                this.pointerMaps.onceDown.forEach(cbs => cbs.forEach(cb => cb(e)))
                this.pointerMaps.onceDown.clear();
            });
            canvas.addEventListener('pointermove', (e) => {
                this.pointerMaps.move.forEach(cbs => cbs.forEach(cb => cb(e)));
                this.pointerMaps.onceMove.forEach(cbs => cbs.forEach(cb => cb(e)))
                this.pointerMaps.onceMove.clear();
            });


            this.GPUReady=this.createGPU(GPUDataSize,gpu => {
                this.mainCamera.initForGPU(gpu.renderPassScreen, gpu, new Projection(gpu));
                gpu.pickRenderPass.perspectiveCameras.add(this.mainCamera);
                //@ts-ignore
                window.printRenderTarget = () => {
                    gpu.pickRenderPass.colorRenderTargets.gRenderTargetId.print_bitmap()
                }
                //@ts-ignore
                window.printRenderTarget2 = () => {
                    gpu.renderPassScreen.depthRenderTarget.print_bitmap()
                }
                //@ts-ignore
                window.printRenderTarget3 = () => {
                    gpu.renderPassScreen.colorRenderTargets.gRenderTargetDiffuse.resolveTexture!.print_bitmap()
                }
            } ,null);
            const saveControllerState = () => {
                this.inputManager?.serialize();
            };
            document.addEventListener('visibilitychange', saveControllerState);
            window.addEventListener('beforeunload', saveControllerState);

        } else {
            this.GPUReady=new Promise(() => {undefined});
        }
        this.physics = new Physics(this);
        this.memory = rust.memory;

        this.collider = new ColliderJS(rust);


        //TODO: this does not work after memory grow
        this.#collidedMesh = new DataView(this.memory.buffer, engine.rust.collided_mesh_pointer(this.collider.collider_ptr), 4);
        wasm.construct(engine.rust.collision_resolved_pointer(this.collider.collider_ptr),
            engine.rust.intersection_point_pointer(this.collider.collider_ptr),
            engine.rust.nearest_distance_squared_pointer(this.collider.collider_ptr),
            engine.rust.collided_mesh_pointer(this.collider.collider_ptr),
            engine.rust.scaled_velocity_pointer(this.collider.collider_ptr),
            engine.rust.scaled_position_pointer(this.collider.collider_ptr),
            engine.rust.collided_point_in_triangle_pointer(this.collider.collider_ptr))

    }
    #getFinalPosition(sphere: Ellipsoid, scaledPosition: TerraVector3, scaledVelocity: TerraVector3): [number, number, number] | TerraVector3 {
        this.collider.didCollide = false;
        for (let i = 0; i < 3; i++) {
            //TODO: really, here inside the loop?
            //TODO: Remove this JS initialize
            this.collider._initialize(scaledPosition, scaledVelocity, closeDistance, sphere);

            //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
            this.wasm._initialize();
            // this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

            // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
            if (sphere instanceof DataNode) {
                DataNode.Meshes.forEach(mesh => {
                    if (sphere !== mesh)
                        mesh.checkCollision(this.collider, sphere)
                });
            }
            else {
                DataNode.Meshes.forEach(mesh => {
                    mesh.checkCollision(this.collider, sphere)
                });
            }
            this.#destinationPoint[0] = scaledPosition[0] + scaledVelocity[0];
            this.#destinationPoint[1] = scaledPosition[1] + scaledVelocity[1];
            this.#destinationPoint[2] = scaledPosition[2] + scaledVelocity[2];


            if (this.collider.collision_resolved) {
                //this.collider.finalPosition.set(scaledPosition);
                return this.#destinationPoint;
            }
            this.collider.didCollide = true;
            if (sphere instanceof DataNode)
                sphere.colliding_character = true;
            const intersectionPoint = this.collider.intersectionPointWasm;
            //console.log('collision found')
            if (scaledVelocity[0] !== 0 || scaledVelocity[1] !== 0 || scaledVelocity[2] !== 0) {
                //this.collider._getResponse(position, velocity);
                // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
                // vel.scaleInPlace((this._nearestDistance / vel.length()));
                let scale = Math.sqrt(this.collider.nearest_distance_squared / (scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2]));
                // let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
                scaledVelocity[0] *= scale;
                scaledVelocity[1] *= scale;
                scaledVelocity[2] *= scale;

                scaledPosition[0] += scaledVelocity[0];
                scaledPosition[1] += scaledVelocity[1];
                scaledPosition[2] += scaledVelocity[2];

                //pos.subtractToRef(this.intersectionPoint, this._slidePlaneNormal);

                if (this.collider.collided_point_in_triangle) {
                    //TODO: this does not work on ellipsoid space.
                    this.collider._slidePlaneNormal[0] = this.collider.collided_point_in_triangle[0];
                    this.collider._slidePlaneNormal[1] = this.collider.collided_point_in_triangle[1];
                    this.collider._slidePlaneNormal[2] = this.collider.collided_point_in_triangle[2];

                } else {
                    this.collider._slidePlaneNormal[0] = scaledPosition[0] - intersectionPoint[0];
                    this.collider._slidePlaneNormal[1] = scaledPosition[1] - intersectionPoint[1];
                    this.collider._slidePlaneNormal[2] = scaledPosition[2] - intersectionPoint[2];

                    // this._slidePlaneNormal.normalize();
                    // const length = Math.sqrt(this.collider._slidePlaneNormal[0] * this.collider._slidePlaneNormal[0] + this.collider._slidePlaneNormal[1] * this.collider._slidePlaneNormal[1] + this.collider._slidePlaneNormal[2] * this.collider._slidePlaneNormal[2]);
                    const length = Math.hypot(this.collider._slidePlaneNormal[0], this.collider._slidePlaneNormal[1], this.collider._slidePlaneNormal[2]);

                    if (!(length === 0 || length === 1.0)) {
                        const norm = 1 / length;
                        this.collider._slidePlaneNormal[0] *= norm;
                        this.collider._slidePlaneNormal[1] *= norm;
                        this.collider._slidePlaneNormal[2] *= norm;
                    }
                }

                //DEBUG START
                /*
                this.collider._slidePlaneNormal[0]= -0.5877852439880371
                this.collider._slidePlaneNormal[1]= 0.80901700258255
                this.collider._slidePlaneNormal[2]= 0
                */
                //DEBUG END


                // console.log('slidePlaneNormal',...this.collider._slidePlaneNormal)

                /*  this.#displacementVector[0] = slidePlaneNormalWorld[0] * this.collider.epsilon;
                  this.#displacementVector[1] = slidePlaneNormalWorld[1] * this.collider.epsilon;
                  this.#displacementVector[2] = slidePlaneNormalWorld[2] * this.collider.epsilon;*/

                this.#displacementVector[0] = this.collider._slidePlaneNormal[0] * sphere.closeDistanceVector[0];
                this.#displacementVector[1] = this.collider._slidePlaneNormal[1] * sphere.closeDistanceVector[1];
                this.#displacementVector[2] = this.collider._slidePlaneNormal[2] * sphere.closeDistanceVector[2];
                // pos.addInPlace(this._displacementVector);
                /*
                    displacementVector is a constraint added to position, so eg. objects that are colliding
                    ground because of gravity, will "flow" of amount of displacementVector.
                    It must be small enought so same force applied from displacement position would cause collide.
                    Otherwise object would constantry jumping on ground.
                */
                scaledPosition[0] += this.#displacementVector[0];
                scaledPosition[1] += this.#displacementVector[1];
                scaledPosition[2] += this.#displacementVector[2];
                //this.intersectionPoint.addInPlace(this._displacementVector);
                intersectionPoint[0] += this.#displacementVector[0];
                intersectionPoint[1] += this.#displacementVector[1];
                intersectionPoint[2] += this.#displacementVector[2];

                const d = -(this.collider._slidePlaneNormal[0] * intersectionPoint[0] + this.collider._slidePlaneNormal[1] * intersectionPoint[1] + this.collider._slidePlaneNormal[2] * intersectionPoint[2]);
                scale = Dot(this.#destinationPoint, this.collider._slidePlaneNormal) + d;

                this.#destinationPoint[0] -= (this.collider._slidePlaneNormal[0] * scale);
                this.#destinationPoint[1] -= (this.collider._slidePlaneNormal[1] * scale);
                this.#destinationPoint[2] -= (this.collider._slidePlaneNormal[2] * scale);

                //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
                scaledVelocity[0] = this.#destinationPoint[0] - intersectionPoint[0];
                scaledVelocity[1] = this.#destinationPoint[1] - intersectionPoint[1];
                scaledVelocity[2] = this.#destinationPoint[2] - intersectionPoint[2];
            }

            const unScaledVelocity = [
                scaledVelocity[0] * sphere.radius[0],
                scaledVelocity[1] * sphere.radius[1],
                scaledVelocity[2] * sphere.radius[2]
            ] as const;
            // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
            if (unScaledVelocity[0] * unScaledVelocity[0] + unScaledVelocity[1] * unScaledVelocity[1] + unScaledVelocity[2] * unScaledVelocity[2] <= closeDistanceSquared) {
                //finalPosition.copyFrom(position);
                return scaledPosition;
            }
        }
        return scaledPosition;
    }
    collideWithWorld(sphere: Ellipsoid, scaledPosition: TerraVector3, scaledVelocity: TerraVector3): void {
        if (sphere instanceof DataNode)
            sphere.colliding_character = false;
        //TODO: Call only when camera position change
        this.collider.finalPosition.set(this.#getFinalPosition(sphere, scaledPosition, scaledVelocity));
        this.collider.finalPosition[0] *= sphere.radius[0]
        this.collider.finalPosition[1] *= sphere.radius[1]
        this.collider.finalPosition[2] *= sphere.radius[2]
    }
}