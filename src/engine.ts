import { Physics } from "./physics.js";
import { GPU } from "./GPU.js";
import { ColliderJS } from "./Collider.js";
import type { Scene } from "./Scene.js";
import type { TerraVector3 } from "./Math.js";
import { TerraCamera } from "./TerraCamera.js";
//@ts-ignore
import { ArcRotateCamera } from "./controllers/ArcRotateCamera.js";
//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import { closeDistance, closeDistanceSquared, DataNode, Ellipsoid } from "./nodes/DataNode.js";
import type { CameraController } from "./controllers/CameraController.js";

const textDecoder = new TextDecoder();

function createError(e: unknown) {
    if (!(e instanceof Error)) {
        return new Error('Unknown error ' + e);
    }
    return e;
}

declare const engine: Engine;
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

export type ListenerObj<K extends (Events & keyof HTMLElementEventMap) = (Events & keyof HTMLElementEventMap)> = {
    type: K,
    cb: (e: HTMLElementEventMap[K]) => (void | boolean);
    options?: ListenerOptions;
    object: object
}
type ListenerOptions = {
    /**
     Is this a event for UI elements.
     */
    ui?: boolean,
    /**
     Does this event trigger before other events.
     */
    priority?: boolean,
    /**
     Is this a event deleted after frist trigger.
     */
    once?: boolean,
    /**
     Make this event non preventable by other events. Events can be prevented by returning "true" in callback
     */
    force?: boolean
};

export type rust_vec_ptr<T> = [ptr: rust_pointer<T>, len: number, cap: number]

export type rustWasm = {
    add_drawble(mesh_id: number): void,
    set_drawble_direct(mesh_id: number, instance_count: number, first_instance: number): void,
    get_instance_count(mesh_id: number): number,
    get_first_instance(mesh_id: number): number,
    set_instance_count(mesh_id: number, instance_count: number): void,
    set_first_instance(mesh_id: number, first_instance: number): void,

    create_tiled_mesh_ptr(width: number, height: number): rust_pointer<'*const usize'>,

    create_octasphere(num_subdivisions: number, half_width: number, half_height: number, half_depth: number): rust_pointer<'*const usize'>

    collider(): rust_pointer<"legacy_collider">,
    intersection_point_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collision_resolved_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    nearest_distance_squared_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    set_nearest_distance_squared(collider_ptr: rust_pointer<"legacy_collider">, distance: number): void
    get_nearest_distance_squared(collider_ptr: rust_pointer<"legacy_collider">): number
    scaled_position_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    scaled_velocity_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collided_mesh_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    collided_point_in_triangle_pointer(collider_ptr: rust_pointer<"legacy_collider">): rust_pointer<'Plane'>
    //set_collided_point_in_triangle_pointer(collider_ptr: rust_pointer<"legacy_collider">, plane: rust_pointer<'Plane'>): void
    collision_found(
        collider_ptr: rust_pointer<"legacy_collider">,
        t: number,
        velocitySquaredLength: number,
        collision_point_x: number,
        collision_point_y: number,
        collision_point_z: number,
        collided_point_in_triangle: boolean,
        collided_plane: number): void,
    get_lowest_root(a: number, b: number, c: number, maxR: number): number
    set_speed(collider_ptr: rust_pointer<"legacy_collider">, speed: number): void
    basepoint_world_pointer(collider_ptr: rust_pointer<"legacy_collider">): number
    renderloop(): void,

    new_mesh(
        point_light: number,
        directional_light: number,
        scenes: number,
        strip: boolean,
        fixed: boolean,
        rigid_body: boolean,
        label_ptr: number,
        label_len: number,
        label_cap: number
    ): number,
    have_rigid_body(mesh_id: number): boolean,
    create_geometry(
        mesh_id: number,
        has_bounding: boolean,
        vertices_stride: number,
        static_faces: boolean,
        strip: boolean): void,
    add_collider(mesh_id: number,
        collider: rust_pointer<"collider">): void
    memory: WebAssembly.Memory,
    set_vertices(mesh_id: number, ptr: rust_pointer<"f32">, length: number, cap: number): void,
    set_indices(mesh_id: number, ptr: rust_pointer<"usize">, length: number, cap: number): void,
    set_indices_and_vertices(mesh_id: number, indices: rust_pointer<"usize">, indices_length: number, indices_cap: number, vertices: rust_pointer<"f32">, vertices_length: number, vertices_cap: number): void,
    vertices_pointer(mesh_id: number): number,
    indices_field_pointer(mesh_id: number): rust_pointer<'indices_indices'>,
    last_collider_world_vertices_pointer(mesh_id: number): number,
    vertices_count(mesh_id: number): number,
    faces_count(mesh_id: number): number,
    alloc_vector_f32(size: number): rust_pointer<"usize">,
    alloc_vector_u8(size: number): rust_pointer<"usize">,
    alloc_vector_usize(size: number): rust_pointer<"usize">,
    update_scale(mesh_id: number, x: number, y: number, z: number): void,
    update_rotation(mesh_id: number, x: number, y: number, z: number, w: number): void,
    update_euler_angles(mesh_id: number, x: number, y: number, z: number): void,
    update_translation(mesh_id: number, x: number, y: number, z: number): void,
    apply_impulse(mesh_id: number, x: number, y: number, z: number): void,
    update_dynamic_buffer(mesh_id: number): void,
    gpu_alignment(mesh_id: number): number,
    positions_count(mesh_id: number): number,
    set_positions_count(mesh_id: number, positions_count: number): number,
    get_mesh_by_id(id: number): rust_pointer<"mesh">,
    strip(mesh_id: number): number,
    collider_planes_parallel_pointer(mesh_id: number): rust_pointer<"collider_planes_parallel_pointer">,
    gpu_pointer(mesh_id: number): number,
    label_field_pointer(mesh_id: number): rust_pointer<"label_field">,
    translation_pointer(mesh_id: number): rust_pointer<"translation">,
    rotation_pointer(mesh_id: number): rust_pointer<"rotation">,
    rotation_pointer_euler(mesh_id: number): rust_pointer<"f32">,
    scale_pointer(mesh_id: number): rust_pointer<"scale">,
    velocity_pointer(mesh_id: number): rust_pointer<"velocity">,
    intersect_box_aa_sphere(mesh_id: number, collider_ptr: number, radius: number): boolean
    scale_x(mesh_id: number): number,
    scale_y(mesh_id: number): number,
    scale_z(mesh_id: number): number,
    vertices_stride(mesh_id: number): number,
    set_faces(mesh_id: number, ptr: number, length: number, cap: number): void,
    set_color(mesh_id: number, d0: number, d1: number, d2: number, d3: number): void,
    set_ambient(mesh_id: number, r: number, g: number, b: number): void
    set_shadow(mesh_id: number, shadow: number): void
    collider_faces_pointer(mesh_id: number): rust_pointer<'collider_faces'>,
    set_scenes(mesh_id: number, scenes: number): void,
    update_scale_and_rotation(mesh_id: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number): void
    faces_pointer(mesh_id: number): number,
    bounding_vectors_pointer_simd(mesh_id: number): rust_pointer<'*const usize'>,

    create_elevator(mesh_id: number): rust_pointer<"elevator">,
    mouse_position_pointer(elevator_ptr: rust_pointer<"elevator">): number
    elevate(elevator_ptr: rust_pointer<"elevator">, mesh_id: number, radius: number, height: number): void
    get_length(elevator_ptr: rust_pointer<"elevator">): number
    get_offset(elevator_ptr: rust_pointer<"elevator">): number

    init_engine2(): number
    physic_tick(): void

    create_ball_collider(radius: number): rust_pointer<"collider">
    create_capsule_collider(half_height: number, radius: number, orientation: 0 | 1 | 2, collision_events: boolean): rust_pointer<"collider">,
    create_trimesh_collider(mesh_id: number): rust_pointer<"collider">
    create_cuboid_collider(hx: number, hy: number, hz: number, border_radius: number, collision_events: boolean): rust_pointer<"collider">
    create_cone_collider(half_height: number, radius: number): rust_pointer<"collider">

    get_box_vertices(): rust_pointer<"f32">
    get_box_indices(): rust_pointer<"u32">
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
    construct(collisionFound: number,
        nearestDistanceSquaredPointer: number,
        collidedMeshPointer: number,
        velocity: number,
        basePoint: number,
        collidedPointInTrianglePointer: number,
        rust_collider_ptr: rust_pointer<'legacy_collider'>): void;
    memory: WebAssembly.Memory
    testTriangles: (position: rust_pointer<"collider_faces">, positionParallel: rust_pointer<"collider_planes_parallel_pointer">, length: number, meshID: number) => void
    _initialize: () => void
}
let deviceId = 0;
type Events = 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerleave' | 'wheel' | 'keydown' | 'keyup'

function stringFromPtr(memory: WebAssembly.ExportValue | undefined, ptr: number) {
    if (!(memory instanceof WebAssembly.Memory)) {
        throw new Error('Webassembly module does not have memory');
    }
    const [/*cap*/, s_ptr, len] = new Uint32Array(memory.buffer, ptr, 3);
    return textDecoder.decode(new Uint8Array(memory.buffer, s_ptr, len));
}

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
    canvas?: HTMLCanvasElement;
    devTools?: HTMLElement;
    GPUSubscribions: Set<((gpu: GPU) => void)> = new Set();
    GPUSubscribionsOnce: Set<((gpu: GPU) => void)> = new Set();
    getGPU(cb: (gpu: GPU) => void, once = false) {
        if (once)
            this.GPUSubscribionsOnce.add(cb);
        else
            this.GPUSubscribions.add(cb);
        if (this.gpu)
            cb(this.gpu)
    }
    static async initEngine(
        nodes: {
            canvas: HTMLCanvasElement,
            devTools: HTMLElement,
        } | undefined,
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
            console: {
                log(ptr: number) {
                    console.log(stringFromPtr(rust.instance.exports.memory, ptr));
                },
                warn(ptr: number) {
                    console.warn(stringFromPtr(rust.instance.exports.memory, ptr))
                }
            },
            env: {
                now() {
                    return performance.now()
                },
                jspanic(ptr: number) {
                    if (!(rust.instance.exports.memory instanceof WebAssembly.Memory)) {
                        throw new Error('Webassembly module does not have memory');
                    }
                    console.error(textDecoder.decode(new Uint8Array(rust.instance.exports.memory.buffer, ptr, 512)).trimEnd())
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
                rust = await WebAssembly.instantiateStreaming(wasmBinaries.rust, exportObj);
            }
            if (!rust.instance.exports.memory) {
                return showError(new Error('No memory exported'));
            }
            var rustWasm = rust.instance.exports as rustWasm;
            GPUDataSize = rustWasm.init_engine2();
            if (nodes?.canvas && !window.navigator.gpu) {
                throw (new Error('no webgpu support'));
            }


            const colliderExportObj = {
                rust: rust.instance.exports,
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
        return new Engine(DB ? await DB : undefined, nodes, wasm, rustWasm, showError, GPUDataSize);
    }
    readonly cameras: Set<TerraCamera> = new Set();

    showError(e: unknown, gpu?: GPU) {
        if (e instanceof Error) {
            if (
                (e.message.includes("Device") && e.message.includes("is lost")) ||
                (e.cause instanceof Error && e.cause.message.includes("Device") && e.cause.message.includes("is lost")) ||
                (e.message === "Device destroyed before callback") ||
                (e.cause instanceof Error && e.cause.message === "Device destroyed before callback")
            ) {
                //When device is lost new device will be set in GPU.ts
                console.log('Omit error on lost device, current GPU:', engine.gpu?.device.label, 'destroyed:', engine.gpu?.destroyed, 'error GPU:', gpu?.device.label, 'destroyed:', gpu?.destroyed)
                return;
            }
            this.showErrorError(e);
            return;
        }
        const error = createError(e);
        this.showErrorError(error);
    }
    gpu: GPU | undefined
    async createGPU(GPUDataSize: number, cb: (gpu: GPU) => void, adapter: GPUAdapter | null) {
        let device: GPUDevice | undefined;
        let forceFallbackAdapter = false;
        let forceLowPower = false;
        do {
            console.log('Getting adapter, low-power:', forceLowPower, 'fallback:', forceFallbackAdapter)
            adapter = await window.navigator.gpu.requestAdapter(
                {
                    powerPreference: forceLowPower ? 'low-power' : 'high-performance',
                    forceFallbackAdapter
                })
            if (!adapter) {
                if (forceFallbackAdapter && forceLowPower) {
                    throw new Error('Could not get adapter');
                }
                console.log('Failed to get adapter');
                // Try with fallback adapter
                if (!forceLowPower && !forceFallbackAdapter) {
                    forceFallbackAdapter = true;
                }
                // Did not succeed with fallback adapter, try with low power
                else if (!forceLowPower && forceFallbackAdapter) {
                    forceFallbackAdapter = false
                    forceLowPower = true
                }
                // Did not owrk with low power, try low power with fallback adapter
                else if (forceLowPower && !forceFallbackAdapter) {
                    forceFallbackAdapter = true;
                }
                continue;
            }
            try {
                console.log('Getting device')
                device = await adapter.requestDevice({ label: 'device' + (deviceId++) });
            } catch (e) {
                console.error(e);
                console.log('Failed to get device');
                if (forceFallbackAdapter) {
                    throw new Error('Could not get device');
                }
                forceFallbackAdapter = true;
                continue;
            }
        } while (typeof device === 'undefined')

        device.lost.then(reason => {
            console.error('GPU device lost', reason);
            const newGPU = this.createGPU(GPUDataSize, cb, adapter);
            this.gpu!.onDeviceLost();
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
        console.log('new GPU initialized ', device.label);
        cb(gpu)
        return gpu;

    }
    #inputMaps = {
        pointerdown: new Set<ListenerObj>(),
        pointerup: new Set<ListenerObj>,
        pointermove: new Set<ListenerObj>,
        pointerleave: new Set<ListenerObj>,
        wheel: new Set<ListenerObj>,
        keydown: new Set<ListenerObj>,
        keyup: new Set<ListenerObj>,
    };

    /*
        Add listener to canvas element.
         * type: type of listener
         * object: The object which adds the listener, this is used to remove listener when object is destroyed
    */
    addInputListener<K extends (Events & keyof HTMLElementEventMap) = (Events & keyof HTMLElementEventMap)>(obj: ListenerObj<K>) {
        // To ensure that events added while processing events does not trigger in same loop
        queueMicrotask(() => {
            if (obj.options?.priority && this.#inputMaps[obj.type]!.size > 0) {
                //@ts-expect-error
                this.#inputMaps[obj.type] = new Set([obj, ...this.#inputMaps[obj.type]!])
            } else {
                //@ts-expect-error
                this.#inputMaps[obj.type].add(obj);
            }
        })

    }
    removeInputListener<K extends (Events & keyof HTMLElementEventMap) = (Events & keyof HTMLElementEventMap)>(listenerObj: ListenerObj<K>) {
        //@ts-expect-error
        const removed = this.#inputMaps[listenerObj.type].delete(listenerObj);
        if (!removed) {
            console.warn('Removed', listenerObj.type, 'listener on', listenerObj.object, 'that did not exists');
        }
    }
    clearInputListeners(object: object) {
        Object.values(this.#inputMaps).forEach(set => {
            Array.from(set).forEach(eventObj => {
                if (eventObj.object === object) {
                    set.delete(eventObj);
                }
            })
        });
    }
    constructor(
        public DB: EarthDatabase | undefined,
        nodes: {
            canvas: HTMLCanvasElement,
            devTools: HTMLElement,
        } | undefined,
        public wasm: ColliderWasm,
        public rust: rustWasm,
        public showErrorError: (e: Error) => void,
        GPUDataSize: number,
    ) {
        if (nodes) {
            this.canvas = nodes.canvas;
            this.devTools = nodes.devTools;
        }

        //@ts-ignore
        globalThis.engine = this;
        this.mainCamera = new TerraCamera('mainCamera', "renderPassScreen");

        if (nodes?.canvas) {
            (['pointerup', 'pointerdown', 'pointermove', 'wheel', 'pointerleave', 'keydown', 'keyup'] as const).forEach(eventType => {
                // keyup and keydown wont trigger if listener is canvas
                nodes.canvas.ownerDocument.addEventListener(eventType, (e) => {
                    // Do not trigger on devtools
                    if (!(eventType === 'keydown' || eventType === 'keyup') && e.target !== nodes.canvas) {
                        return;
                    }
                    const UIEvents = Array.from(this.#inputMaps[eventType]).filter(eventObj => {
                        return eventObj.options?.ui
                    });
                    let cancelled = false;
                    for (let i = 0; i < UIEvents.length; i++) {
                        if (!cancelled || UIEvents[i]!.options?.force) {
                            if (UIEvents[i]!.options?.once) {
                                this.#inputMaps[eventType].delete(UIEvents[i]!);
                            }
                            cancelled = (UIEvents[i]!.cb(e) ?? false) || cancelled;
                        }
                    }
                    const OtherEvents = Array.from(this.#inputMaps[eventType]).filter(eventObj => {
                        return !eventObj.options?.ui
                    });
                    for (let i = 0; i < OtherEvents.length; i++) {
                        if (!cancelled || OtherEvents[i]!.options?.force) {
                            if (OtherEvents[i]!.options?.once) {
                                this.#inputMaps[eventType].delete(OtherEvents[i]!);
                            }
                            cancelled = (OtherEvents[i]!.cb(e) ?? false) || cancelled
                        }
                    }
                }, { passive: false });
            });
            const waterCamera = new TerraCamera('waterCamera', "renderPassWater", this.mainCamera);
            waterCamera.beforeViewUpdate.add((position, direction) => {
                position[1] -= (position[1] - 3) * 2;
                direction[1] = -direction[1];
            });
            this.GPUReady = this.createGPU(GPUDataSize, gpu => {
                this.GPUSubscribions.forEach(cb => {
                    cb(gpu);
                });
                this.GPUSubscribionsOnce.forEach(cb => {
                    cb(gpu);
                });
                this.GPUSubscribionsOnce.clear();

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
            }, null);
            const saveControllerState = () => {
                this.inputManager?.serialize();
            };
            document.addEventListener('visibilitychange', saveControllerState);
            window.addEventListener('beforeunload', saveControllerState);

        } else {
            this.GPUReady = new Promise(() => { return; });
        }
        this.physics = new Physics(this);
        this.memory = rust.memory;

        this.collider = new ColliderJS(rust);


        //TODO: this does not work after memory grow
        this.#collidedMesh = new DataView(this.memory.buffer, engine.rust.collided_mesh_pointer(this.collider.collider_ptr), 4);
        wasm.construct(
            engine.rust.collision_resolved_pointer(this.collider.collider_ptr),
            engine.rust.nearest_distance_squared_pointer(this.collider.collider_ptr),
            engine.rust.collided_mesh_pointer(this.collider.collider_ptr),
            engine.rust.scaled_velocity_pointer(this.collider.collider_ptr),
            engine.rust.scaled_position_pointer(this.collider.collider_ptr),
            engine.rust.collided_point_in_triangle_pointer(this.collider.collider_ptr),
            this.collider.collider_ptr)
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
                DataNode.CharacterCanCollideMeshes.forEach(mesh => {
                    if (sphere !== mesh)
                        mesh.checkCollision(this.collider, sphere)
                });
            }
            else {
                DataNode.CharacterCanCollideMeshes.forEach(mesh => {
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