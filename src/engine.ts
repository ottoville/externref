import { Physics } from "./physics.js";
import { GPU } from "./GPU.js";
import { MainNode } from "./MainNode.js";
import { ColliderJS } from "./Collider.js";
import type { Scene } from "./Scene.js";
import type { TerraVector3 } from "./Math.js";
import { Uint16Vector2 } from "./Math.js";
import { GPUBufferUsage } from "./GPU.js";
import { TerraCamera } from "./TerraCamera.js";
import { Projection } from "./GPU/Projection.js";
import type { CameraController } from "./controllers/CameraController.js";
//@ts-ignore
import { PositionCamera } from "./controllers/PositionCamera.js";
//@ts-ignore
import { ArcRotateCamera } from "./controllers/ArcRotateCamera.js";
//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";
import type { PickableRenderPass } from "./GPU/RenderPass.js";
import { Texture } from "./GPU/Texture.js";
import { closeDistance, closeDistanceSquared, Ellipsoid } from "./DataNode.js";
import { ComputePipeline } from "./GPU/ComputePipeline.js";
import { Buffer } from "./GPU/Buffer.js";

declare const engine:Engine;
let curSecond = 0;
let framecount = 0;
//@ts-ignore
window.fps = 0;
let GPUQueueCommandEncoder:GPUCommandEncoder | null = null;
export type rust_pointer<T> = {
    __brand:T
} & number

window.addEventListener('unhandledrejection', (e) => {
    console.log(e)
    console.error('unhandledrejection');
    debugger;
})
export type rustWasm = {
    collider():rust_pointer<"legacy_collider">,
    intersection_point_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    collision_resolved_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    nearest_distance_squared_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    set_nearest_distance_squared(collider_ptr:rust_pointer<"legacy_collider">, distance:number):void
    get_nearest_distance_squared(collider_ptr:rust_pointer<"legacy_collider">):number
    scaled_position_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    scaled_velocity_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    collided_mesh_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    set_speed(collider_ptr:rust_pointer<"legacy_collider">, speed:number):void
    basepoint_world_pointer(collider_ptr:rust_pointer<"legacy_collider">):number
    renderloop():void,

    new_mesh(id:number,
        positions_count:number,
        point_light:number,
        directional_light:number,
        scenes:number,
        strip:boolean,
        fixed:boolean,
        rigid_body:boolean,
        label: rust_pointer<"u8">): rust_pointer<"mesh">,
    add_geometry(mesh:rust_pointer<"mesh">,
        has_bounding:boolean,
        vertices_stride:number,
        static_faces:boolean,
        strip:boolean):void,
    add_collider(mesh:rust_pointer<"mesh">,
        collider:rust_pointer<"collider">):void
    memory: WebAssembly.Memory,
    set_vertices(mesh:rust_pointer<"mesh">, ptr:rust_pointer<"f32">, length:number):void,
    set_indices_and_vertices(mesh:rust_pointer<"mesh">, indices:rust_pointer<"usize">, indices_length:number, vertices:rust_pointer<"f32">, vertices_length:number):void,
    vertices_pointer(mesh:rust_pointer<"mesh">):number,
    indices_pointer(mesh:rust_pointer<"mesh">):number,
    last_collider_world_vertices_pointer(mesh:rust_pointer<"mesh">):number,
    vertices_count(mesh:rust_pointer<"mesh">):number,
    faces_count(mesh:rust_pointer<"mesh">):number,
    alloc_vector_f32(size:number) :rust_pointer<"f32">,
    alloc_vector_usize(size:number): rust_pointer<"usize">,
    alloc_string(size:number): rust_pointer<"u8">,
    update_scale(mesh:rust_pointer<"mesh">, x:number, y:number, z:number):void,
    update_rotation(mesh:rust_pointer<"mesh">, x:number, y:number, z:number, w:number):void,
    update_euler_angles(mesh:rust_pointer<"mesh">, x:number, y:number, z:number):void,
    update_translation(mesh:rust_pointer<"mesh">, x:number, y:number, z:number):void,
    update_dynamic_buffer(mesh:rust_pointer<"mesh">):void,
    gpu_alignment(mesh:rust_pointer<"mesh">):number,
    positions_count(mesh:rust_pointer<"mesh">):number,
    id(mesh:rust_pointer<"mesh">):number,
    strip(mesh:rust_pointer<"mesh">):number,
    collider_planes_parallel_pointer(mesh:rust_pointer<"mesh">):number,
    gpu_pointer(mesh:rust_pointer<"mesh">):number,
    translation_pointer(mesh:rust_pointer<"mesh">):number,
    velocity_pointer(mesh:rust_pointer<"mesh">):number,
    acceleration_pointer(mesh:rust_pointer<"mesh">):number,
    intersect_box_aa_sphere(mesh:rust_pointer<"mesh">,collider_ptr:number, radius:number):boolean
    scale_x(mesh:rust_pointer<"mesh">):number,
    scale_y(mesh:rust_pointer<"mesh">):number,
    scale_z(mesh:rust_pointer<"mesh">):number,
    vertices_stride(mesh:rust_pointer<"mesh">):number,
    set_faces(mesh:rust_pointer<"mesh">, ptr:number, length:number):void,
    set_gpu_custom_data(mesh:rust_pointer<"mesh">, d0:number,d1:number,d2:number,d3:number):void,
    collider_faces_pointer(mesh:rust_pointer<"mesh">):number,
    set_scenes(mesh:rust_pointer<"mesh">, scenes:number):void,
    update_scale_and_rotation(mesh:rust_pointer<"mesh">, x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number):void
    faces_pointer(mesh:rust_pointer<"mesh">):number,
    bounding_vectors_pointer_simd(mesh:rust_pointer<"mesh">):number,

    create_elevator(mesh:rust_pointer<"mesh">):rust_pointer<"elevator">,
    mouse_position_pointer(elevator_ptr:rust_pointer<"elevator">):number
    elevate(elevator_ptr:rust_pointer<"elevator">, mesh:rust_pointer<"mesh">, radius:number, height:number):void
    get_length(elevator_ptr:rust_pointer<"elevator">):number
    get_offset(elevator_ptr:rust_pointer<"elevator">):number

    init_engine2():void
    physic_tick():void

    create_ball_collider(radius: number): rust_pointer<"collider">
    create_trimesh_collider(mesh:rust_pointer<"mesh">): rust_pointer<"collider">
    create_convex_hull_collider(mesh:rust_pointer<"mesh">): rust_pointer<"collider">
    create_cuboid_collider(hx: number, hy: number, hz: number): rust_pointer<"collider">
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
        version:4,
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
    construct(collisionFound: number, intersectionPointer: number, nearestDistanceSquaredPointer: number, collidedMeshPointer: number, velocity: number, basePoint: number): void;
    memory: WebAssembly.Memory
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: number, positionParallel: number, length: number, meshID: number) => void
    _initialize: () => void
}
export class Engine {

    /*
        This is the distance that collision response will set the object after collide.
        It is the constraint that keeps objects together. So when force is applied, the collision occurs.
        For gravity (at 60fps) it must be lower than   9.80665*0.016*0.016 = 0,0027240694444442 
        TODO: make other constraints for other forces than gravity
    */

    // registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    readonly physics:Physics;
    readonly scenes: Map<string, Scene> = new Map();
    // readonly collisionNotFound:DataView
    //@ts-ignore
    readonly #collidedMesh: DataView
    readonly collider: ColliderJS;

    readonly #mousePositionBuffer = new SharedArrayBuffer(4);
    readonly mousePosition = new Uint16Vector2(this.#mousePositionBuffer);

    readonly #destinationPoint: [number, number, number] = [0, 0, 0];
    readonly #displacementVector: [number, number, number] = [0, 0, 0];

    #updateLights = false;
    inputManager: CameraController | null = null
    #renderFrame = 0;
    readonly mainCamera: TerraCamera<PickableRenderPass>;
    memory: WebAssembly.Memory;
    static async initEngine(canvas: HTMLCanvasElement, showError: (e: Error) => void): Promise<Engine> {
        const DB = new Promise<EarthDatabase>(function (res) {
            var IDB = indexedDB.open("City", 6);
            IDB.onupgradeneeded = function (e) {
                console.log('IDBVersionChangeEvent',e);
                // Save the IDBDatabase interface 
                var db: EarthDatabase = this.result;
        
                (<(keyof typeof ObjectStores)[]>Object.keys(ObjectStores)).forEach((objstore) => {
                    let createdStore :IDBObjectStore 
                    if(ObjectStores[objstore].version>e.oldVersion) {
                        createdStore = db.createObjectStore(objstore, ObjectStores[objstore].parameters);
                    } else {
                        if (!this.transaction)
                            throw (new Error('No transaction'));
                        createdStore=this.transaction.objectStore(objstore);
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
                     console.log(e,((<IDBRequest>e.target)!).error!.message);
                }
                res(this.result);
            }
        })

        if (!window.navigator.gpu)
            throw (new Error('no webgpu support'));


        const adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then(GPUAdapter => {
            if(!GPUAdapter) {
                console.error('Failed to get adapter, getting fallback adapter');
                return window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance', forceFallbackAdapter: true });
            }
            return GPUAdapter;
        })
        if(!adapter) {
            throw (new Error('Failed to get adapter'));
        }
        const device = await adapter.requestDevice();
        //this.progress = 5;
        if (!device)
            throw (new Error('no GPU device'));
        device.lost.then(reason => {
            console.error('GPU device lost', reason);
        });

        const gpu = new GPU(canvas, adapter, device);
        //@ts-ignore
        window.printRenderTarget = () => {
            Texture.toBitmap(gpu.pickRenderPass.renderTargets.gRenderTargetId.texture);
        }
        //@ts-ignore
        window.printRenderTarget2 = () => {
            Texture.toBitmap(gpu.renderPassScreen.depthTexture);
        }
        //@ts-ignore
        window.printRenderTarget3 = () => {
            Texture.toBitmap(gpu.renderPassScreen.renderTargets.gRenderTargetDiffuse.texture)
        }
        const map = new Map<number, number>();
        const dataSizeBytes = MainNode.GPUDataSize * 4; //4 * 16 + 3 * 4;

        //Init rust wasm
        const rust = await WebAssembly.instantiateStreaming(await fetch('/js/engine/wasm32-unknown-unknown/debug/engine.wasm'), {
            env: {
                update_point_lights:(pointer: number, length: number) => {
                    engine.update_point_lights(pointer, length)
                },
                update_directional_lights:(pointer: number, length: number) => {
                    engine.update_directional_lights(pointer, length)
                },
                handle_gpu_queue:(pointerVec:number, length:number) => {
                    GPUQueueCommandEncoder=gpu.device.createCommandEncoder();
                    const pointers_to_gpumesh_and_alignment = new Uint32Array(engine.memory.buffer, pointerVec, length * 2);
                    for (let i = 0; i < pointers_to_gpumesh_and_alignment.length; i += 2) {
                        map.set(pointers_to_gpumesh_and_alignment[i]!, pointers_to_gpumesh_and_alignment[i + 1]!);
                    }
                    let tempOffset = 0;

                    Buffer.create(gpu, dataSizeBytes * map.size, [GPUBufferUsage.COPY_SRC],'handle_gpu_queue', tempBuffer => {
                        map.forEach((alignment, gpumeshPointer) => {
                            const data = new Float32Array(engine.memory.buffer, gpumeshPointer, MainNode.GPUDataSize);
                            //Point light
                            if (data[29]! > 0) {
                                engine.#updateLights = true;
            
                            }
                            new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(data);
                            gpu.GPUMeshes.copyFrom(GPUQueueCommandEncoder!, tempBuffer, tempOffset++ * dataSizeBytes, gpu.gpu_memory_index_size + alignment * 256, dataSizeBytes)

                        });
                        map.clear();
                        engine.gpu.tempGPUBuffers.add(tempBuffer);    
                    });
                },
                //TODO: Queue this call and do it only once per frame
                updateAllocatedMemory(allocated_gpu_memory_ptr:number, length:number) {
                    const renderEncoder = engine.gpu.device.createCommandEncoder();
                    const buffLength = Uint32Array.BYTES_PER_ELEMENT * length;
                    const tempBuffer = Buffer.create(gpu, buffLength, [GPUBufferUsage.COPY_SRC],'tempBuffer', tempBuffer2 => {
                        new Uint32Array(tempBuffer2.getMappedRange(0, buffLength)).set(new Uint32Array(engine.rust.memory.buffer, allocated_gpu_memory_ptr, length));
                    });
                    tempBuffer.copyTo(renderEncoder, engine.gpu.GPUMeshes,0, 0, buffLength);
                },
                now() {
                    return performance.now()
                },
                jspanic(ptr:number) {
                    console.error(new TextDecoder().decode(new Uint8Array(engine.rust.memory.buffer, ptr, 512)).trimEnd())
                },
                jslog(ptr:number) {
                    console.log(new TextDecoder().decode(new Uint8Array(engine.rust.memory.buffer, ptr, 512)).trimEnd())
                },
                jslog_number(number:number) {
                    console.log(number)
                },
            }
        });
        if(!rust.instance.exports.memory) {
            throw(new Error('No memory exported'));
        }
        const obj = await WebAssembly.instantiateStreaming(await fetch('collider/colliderSimdO.wasm'), {
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
        });
        const wasm = obj.instance.exports as unknown as ColliderWasm;
        return new Engine(gpu, await DB, canvas, wasm, rust.instance.exports as rustWasm, showError);
    }
    attachCameraInput(initial = false) {
        this.inputManager = new ArcRotateCamera(this.mainCamera, initial);
        //this.inputManager = new PositionCamera(this.mainCamera,initial);
    }
    readonly #timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly #timeView = new Uint32Array(this.#timeAndDeltaBuffer, 0, 1);
    readonly deltaView = new Float32Array(this.#timeAndDeltaBuffer, 4, 1);
    readonly cameras:Set<TerraCamera>=new Set();
    readonly #renderLoop = (time: DOMHighResTimeStamp) => {
        //msPerFrame = performance.now() - startTime;
        //startTime = performance.now();

        const nowSecond = (Date.now() / 500) | 0;
        if (nowSecond !== curSecond) {
            //@ts-ignore
            window.fps = framecount * 2;
            curSecond = nowSecond;
            framecount = 0;
        }
        framecount++;
        //performance.mark('renderloopStart');



        GPUQueueCommandEncoder=null;
        engine.rust.renderloop();
        //@ts-ignore bug in TS
        const commandBuff= GPUQueueCommandEncoder?.finish() ?? null;
        if(commandBuff)
            this.gpu.pendingCommandBuffers.add(commandBuff);

        if (this.inputManager?.checkInputs()) {
            if(this.inputManager.calculateCameraPositionAndTarget)
            this.inputManager.calculateCameraPositionAndTarget();
        }

        const renderEncoder = this.gpu.device.createCommandEncoder();

        this.#timeView.set([time]);
        let physicDelta: number | null;
        if (this.physics.gameSpeed == -1)
            physicDelta = null;
        else
            physicDelta = (this.physics.physicTime - this.physics.tickTime) / ((this.physics.tickIntervalMs))

        if (physicDelta !== null)
            this.deltaView.set([physicDelta]);

        this.gpu.timeBuffer.write(0, this.#timeAndDeltaBuffer);
        try {
            this.cameras.forEach(camera => {
                camera.updateView(renderEncoder)
            })
            const lightPass = renderEncoder.beginComputePass();
            lightPass.setPipeline(this.gpu.updateViewPipeline.pipeline);
            lightPass.setBindGroup(0, this.gpu.updateViewBindGroup);
            this.cameras.forEach(camera => {
                if(camera.viewUpdated || this.#updateLights) {
                    camera.viewUpdated=false;
                    lightPass.setBindGroup(1, camera.updateViewBindGroup.bindGroup);
                    lightPass.dispatchWorkgroups(...this.gpu.CLUSTER_DISPATCH_SIZE);
                }
            });
            lightPass.end();
            this.#updateLights = false;

            this.gpu.renderPasses.forEach(renderPass => {
                renderPass.render(renderEncoder)
            })
        } catch (e) {
            console.error(e);
        }

        this.gpu.pendingCommandBuffers.add(renderEncoder.finish())
        this.gpu.device.queue.submit(this.gpu.pendingCommandBuffers);
        this.gpu.pendingCommandBuffers.clear();
        this.gpu.tempGPUBuffers.forEach(buff => buff.destroy())
        this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
    }
    showError(e:unknown) {
        if(!(e instanceof Error)) {
            this.showErrorError(new Error('Unknown error ' + e));
        }
        else {
            if(!e.cause)
                this.showErrorError(e);
        }

    }
    constructor(
        public gpu: GPU,
        public DB: EarthDatabase,
        public canvas: HTMLCanvasElement,
        public wasm: ColliderWasm,
        public rust: rustWasm,
        public showErrorError: (e: Error) => void
    ) {
        this.physics = new Physics(this);
        this.memory = rust.memory;
        window.engine = this;
        this.mainCamera = new TerraCamera(gpu.renderPassScreen, new Projection(gpu), gpu);
        gpu.pickRenderPass.cameras.add(this.mainCamera)

        this.collider = new ColliderJS(rust);
        this.attachCameraInput(true);

        const saveControllerState = () => {
            this.inputManager?.serialize();
        };
        document.addEventListener('visibilitychange', saveControllerState);
        window.addEventListener('beforeunload', saveControllerState);


        //TODO: this does not work after memory grow
        this.#collidedMesh = new DataView(this.memory.buffer, engine.rust.collided_mesh_pointer(this.collider.collider_ptr), 4);
        wasm.construct(engine.rust.collision_resolved_pointer(this.collider.collider_ptr),
            engine.rust.intersection_point_pointer(this.collider.collider_ptr),
            engine.rust.nearest_distance_squared_pointer(this.collider.collider_ptr),
            engine.rust.collided_mesh_pointer(this.collider.collider_ptr),
            engine.rust.scaled_velocity_pointer(this.collider.collider_ptr),
            engine.rust.scaled_position_pointer(this.collider.collider_ptr))


        //this.colliderWASM.getLowestRoot = wasm.getLowestRoot;
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX * gpu.scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * gpu.scale.y)
            Atomics.notify(new Int32Array(this.#mousePositionBuffer), 0);
        });
        let resizeHandler = 0;
        const maxResolution = {
            width: 1920,
            height: 1080
        }
        const computePipelineClustersLayout = gpu.device.createBindGroupLayout({label: 'computePipelineClustersLayout', entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'uniform'
                }
            }
        ]})
        const computePipelineClusters       = new ComputePipeline(gpu,'clusters.comp.wgsl',
        gpu.device.createPipelineLayout({
            bindGroupLayouts:[gpu.sizeBindGroupLayout.layout, computePipelineClustersLayout]
        }));

        if(!canvas.parentElement) {
            throw new Error('Canvas must have parent element');
        }
        const ro = new window.ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry)
                return;
            window.cancelAnimationFrame(this.#renderFrame)
            clearTimeout(resizeHandler);
            resizeHandler = setTimeout(() => {
                try {
                    const aspectRatio = entry.contentRect.width / entry.contentRect.height
                    canvas.width = Math.min((entry.contentRect.width | 0) * window.devicePixelRatio, maxResolution.width);

                    canvas.height = canvas.width / aspectRatio

                    if (canvas.height > maxResolution.height) {
                        canvas.height = maxResolution.height;
                        canvas.width = canvas.height * aspectRatio;
                    }

                    gpu.scale.x = canvas.width / entry.contentRect.width;
                    gpu.scale.y = canvas.height / entry.contentRect.height;
                    // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
                    gpu.context.configure({
                        device: gpu.device,
                        format: gpu.presentationFormat,
                        usage: GPUTextureUsage.RENDER_ATTACHMENT
                    })
                    const commandEncoder = gpu.device.createCommandEncoder();
                    const passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(computePipelineClusters.pipeline);
                    
                    gpu.projections.forEach(projection => projection.update(aspectRatio))

                    gpu.renderPasses.forEach(renderPass => {
                        renderPass.resize(canvas.width, canvas.height);
                        passEncoder.setBindGroup(0, renderPass.sizeBindGroup());
                        renderPass.cameras.forEach(camera => {
                            camera.updateProjection(passEncoder,computePipelineClustersLayout)
                        });
                    });
                    passEncoder.end();
                    gpu.device.queue.submit([commandEncoder.finish()]);

                    this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
                } catch(e) {
                    this.showError(e);
                }
            }, 500)
        });
        ro.observe(canvas.parentElement)
    }
    update_point_lights(pointer:number, length:number) {
        const lights = new Uint32Array(this.memory.buffer, pointer, length);
        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this.gpu, byteLength, [GPUBufferUsage.COPY_SRC], 'point_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights,1);
        });
        tempBuffer.copyTo(commandEncoder, this.gpu.GPUPointLights,0,0,byteLength);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_directional_lights(pointer:number, length:number) {
        const lights = new Uint32Array(this.memory.buffer, pointer, length);
        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this.gpu, byteLength, [GPUBufferUsage.COPY_SRC], 'directional_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights,1);
        });
        tempBuffer.copyTo(commandEncoder, this.gpu.GPUDirectionalLights, 0, 0, byteLength);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    #getFinalPosition(sphere: Ellipsoid): [number, number, number] | TerraVector3 {
        const scaledPosition = this.collider.scaledPosition;
        const scaledVelocity = this.collider.scaledVelocity;
        this.collider.didCollide = false;
        for (let i = 0; i < 3; i++) {
            //TODO: really, here inside the loop?
            //TODO: Remove this JS initialize
            this.collider._initialize(scaledPosition, scaledVelocity, closeDistance, sphere);

            //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
            this.wasm._initialize();
            // this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

            // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
            this.physics.tickables.forEach(mesh => mesh.checkCollision(this.collider, sphere));

            this.#destinationPoint[0] = scaledPosition[0] + scaledVelocity[0];
            this.#destinationPoint[1] = scaledPosition[1] + scaledVelocity[1];
            this.#destinationPoint[2] = scaledPosition[2] + scaledVelocity[2];


            if (this.collider.collision_resolved) {
                //this.collider.finalPosition.set(scaledPosition);
                return this.#destinationPoint;
            }
            this.collider.didCollide=true;
            if(sphere instanceof MainNode)
                sphere.is_colliding = true;
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
                if(this.collider.collidedPointInTriangle) {
                    //TODO: this does not work on ellipsoid space.
                    this.collider._slidePlaneNormal[0]=this.collider.collidedPointInTriangle.planeCollider[0];
                    this.collider._slidePlaneNormal[1]=this.collider.collidedPointInTriangle.planeCollider[1];
                    this.collider._slidePlaneNormal[2]=this.collider.collidedPointInTriangle.planeCollider[2];
                } else {
                    this.collider._slidePlaneNormal[0] = scaledPosition[0] - intersectionPoint[0];
                    this.collider._slidePlaneNormal[1] = scaledPosition[1] - intersectionPoint[1];
                    this.collider._slidePlaneNormal[2] = scaledPosition[2] - intersectionPoint[2];

                    // this._slidePlaneNormal.normalize();
                // const length = Math.sqrt(this.collider._slidePlaneNormal[0] * this.collider._slidePlaneNormal[0] + this.collider._slidePlaneNormal[1] * this.collider._slidePlaneNormal[1] + this.collider._slidePlaneNormal[2] * this.collider._slidePlaneNormal[2]);
                    const length = Math.hypot(this.collider._slidePlaneNormal[0],this.collider._slidePlaneNormal[1],this.collider._slidePlaneNormal[2]);
                
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
    collideWithWorld(sphere: Ellipsoid) : void {
        if(sphere instanceof MainNode)
            sphere.is_colliding=false;
        //TODO: Call only when camera position change
        this.collider.finalPosition.set(this.#getFinalPosition(sphere));
        this.collider.finalPosition[0] *= sphere.radius[0]
        this.collider.finalPosition[1] *= sphere.radius[1]
        this.collider.finalPosition[2] *= sphere.radius[2]
    }
}