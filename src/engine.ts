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
import type { PickableRenderPass } from "GPU/RenderPass.js";
declare const engine:Engine;

let GPUQueueCommandEncoder:GPUCommandEncoder | null = null;

export type rustWasm = {
    collider():number,
    intersection_point_pointer(collider_ptr:number):number
    collision_not_found_pointer(collider_ptr:number):number
    nearest_distance_squared_pointer(collider_ptr:number):number
    scaled_position_pointer(collider_ptr:number):number
    scaled_velocity_pointer(collider_ptr:number):number
    collided_mesh_pointer(collider_ptr:number):number

    handle_gpu_queue_rust():void,

    new_mesh(id:number, has_bounding:boolean,
        has_geometry:boolean,
        positions_count:number,
        vertices_stride:number,
        point_light:number,
        directional_light:number,
        scenes:number,
        static_faces:boolean,
        strip:boolean): number
    memory: WebAssembly.Memory,
    update_vertices(mesh_ptr:number, ptr:number, length:number):void,
    set_indices(mesh_ptr:number, ptr:number, length:number):void,
    vertices_pointer(mesh_ptr:number):number,
    indices_pointer(mesh_ptr:number):number,
    last_collider_world_vertices_pointer(mesh_ptr:number):number,
    vertices_count(mesh_ptr:number):number,
    faces_count(mesh_ptr:number):number,
    alloc_vector_f32(size:number):number,
    alloc_vector_usize(size:number):number,
    update_scale(mesh_ptr:number, x:number, y:number, z:number):void,
    update_rotation(mesh_ptr:number, x:number, y:number, z:number, w:number):void,
    update_dynamic_buffer(mesh_ptr:number):void,
    gpu_alignment(mesh_ptr:number):number,
    positions_count(mesh_ptr:number):number,
    id(mesh_ptr:number):number,
    strip(mesh_ptr:number):number,
    collider_planes_parallel_pointer(mesh_ptr:number):number,
    gpu_pointer(mesh_ptr:number):number,
    translation_pointer(mesh_ptr:number):number,
    velocity_pointer(mesh_ptr:number):number,
    bounding_min_pointer(mesh_ptr:number):number,
    bounding_max_pointer(mesh_ptr:number):number,
    scale_x(mesh_ptr:number):number,
    scale_y(mesh_ptr:number):number,
    scale_z(mesh_ptr:number):number,
    vertices_stride(mesh_ptr:number):number,
    set_faces(mesh_ptr:number, ptr:number, length:number):void,
    set_gpu_custom_data(mesh_ptr:number, d0:number,d1:number,d2:number,d3:number):void,
    collider_faces_pointer(mesh_ptr:number):number,
    set_scenes(mesh_ptr:number, scenes:number):void,
    update_scale_and_rotation(mesh_ptr:number, x: number, y: number, z: number, rx: number, ry: number, rz: number, rw: number):void
    faces_pointer(mesh_ptr:number):number,
    bounding_vectors_pointer_simd(mesh_ptr:number):number,

    create_elevator(mesh_ptr:number):number,
    mouse_position_pointer(elevator_ptr:number):number
    elevate(elevator_ptr:number,mesh_ptr:number, radius:number, height:number):void
    get_length(elevator_ptr:number):number
    get_offset(elevator_ptr:number):number

}

function Dot(left: [number, number, number] | Float32Array | TerraVector3, right: [number, number, number] | Float32Array | TerraVector3): number {
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
    readonly CollisionsEpsilon = 0.001;
    readonly closeDistance = this.CollisionsEpsilon * 10.0;
    readonly closeDistanceSquared = this.closeDistance * this.closeDistance

    // registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    readonly physics = new Physics();
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
    static async initEngine(canvas: HTMLCanvasElement): Promise<Engine> {
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
            throw ('no webgpu support');
        const adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        //this.progress = 4;

        if (!adapter)
            throw ('No adapter');
        const device = await adapter.requestDevice();
        //this.progress = 5;
        if (!device)
            throw ('no GPU device');
        const shaderModules: Map<string, GPUShaderModule> = new Map();
        const shaders = ['simple.vert.wgsl', 'simple.frag.wgsl',
            'water.vert.wgsl', 'water.frag.wgsl', 'ground.vert.wgsl', 'ground.frag.wgsl', 'sun.vert.wgsl', 'sun.frag.wgsl', 'color.frag.wgsl', 'UIColor.frag.wgsl',
            'plane.vert.wgsl', 'helper2.vert.wgsl',
            'terrain/calculatePlaneIndices.comp.wgsl', 'terrain/calculateNormals.comp.wgsl', 'terrain/calculatePlaneHeights.comp.wgsl',
            'terrain/CreateGroundFromHeightMap.comp.wgsl', 'terrain/createTerrainTexture.comp.wgsl',
            'grass/getHeightAtCoordinates.comp.wgsl', 'grass/grass.vert.wgsl', 'deferred.vert.wgsl', 'deferred.frag.wgsl', 'clusters.comp.wgsl', 'debug_normals.vert.wgsl',
            'updateView.comp.wgsl', 'debug_boundingbox.vert.wgsl'
        ];
        await Promise.all(shaders.map(async u => {
            const compiled = await (await fetch('/shaders/wgsl/' + u)).text();
            shaderModules.set(u, device.createShaderModule({ code: compiled }));
        }));
        const gpu = new GPU(canvas, adapter, device, shaderModules);
        //@ts-ignore
        window.printRenderTarget = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetNormals.texture.toBitmap(0)
        }
        //@ts-ignore
        window.printRenderTarget2 = () => {
            gpu.renderPassScreen.depthTexture!.toBitmap(0)
        }
        //@ts-ignore
        window.printRenderTarget3 = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetDiffuse.texture.toBitmap(0)
        }
        const map = new Map<number, number>();
        const dataSizeBytes = MainNode.GPUDataSize * 4; //4 * 16 + 3 * 4;

        //Init rust wasm
        const rust = await WebAssembly.instantiateStreaming(await fetch('/js/engine/engine.wasm'), {
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
                    const tempBuffer = gpu.createGPUBuffer(dataSizeBytes * map.size, [GPUBufferUsage.COPY_SRC], true);
                    let tempOffset = 0;
                    map.forEach((alignment, gpumeshPointer) => {
                        const data = new Float32Array(engine.memory.buffer, gpumeshPointer, MainNode.GPUDataSize);
                        //Point light
                        if (data[29]! > 0) {
                            engine.#updateLights = true;
        
                        }
                        new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(data);
                        GPUQueueCommandEncoder!.copyBufferToBuffer(
                            tempBuffer, tempOffset++ * dataSizeBytes,
                            gpu.GPUMeshes, gpu.gpu_memory_index_size + alignment * 256,
                            dataSizeBytes);
                    });
                    map.clear();
                    tempBuffer.unmap();
                    engine.gpu.tempGPUBuffers.add(tempBuffer);
                },
                //TODO: Queue this call and do it only once per frame
                updateAllocatedMemory(allocated_gpu_memory_ptr:number, length:number) {
                    const renderEncoder = engine.gpu.device.createCommandEncoder();
                    const buffLength = Uint32Array.BYTES_PER_ELEMENT * length;
                    const tempBuffer = engine.gpu.createGPUBuffer(buffLength, [GPUBufferUsage.COPY_SRC], true);
                    new Uint32Array(tempBuffer.getMappedRange(0, buffLength)).set(new Uint32Array(engine.rust.memory.buffer, allocated_gpu_memory_ptr, length));
                    tempBuffer.unmap();
            
                    renderEncoder.copyBufferToBuffer(
                        tempBuffer, 0,
                        engine.gpu.GPUMeshes, 0,
                        buffLength);
                        engine.gpu.pendingCommandBuffers.add(renderEncoder.finish())
                }
            }
        });
        if(!rust.instance.exports.memory) {
            throw(new Error('No memory exported'));
        }
        const obj = await WebAssembly.instantiateStreaming(await fetch('collider/colliderSIMDO.wasm'), {
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
        const wasm: ColliderWasm = obj.instance.exports as any;
        return new Engine(gpu, await DB, canvas, wasm, rust.instance.exports as rustWasm);
    }
    attachCameraInput(initial = false) {
    this.inputManager = new ArcRotateCamera(this.mainCamera, initial);
       //  this.inputManager = new PositionCamera(this.mainCamera,initial);
    }
    readonly #timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly #timeView = new Uint32Array(this.#timeAndDeltaBuffer, 0, 1);
    readonly deltaView = new Float32Array(this.#timeAndDeltaBuffer, 4, 1);
    readonly cameras:Set<TerraCamera>=new Set();
    readonly #renderLoop = (time: DOMHighResTimeStamp) => {
        //msPerFrame = performance.now() - startTime;
        //startTime = performance.now();

        //const nowSecond = (Date.now() / 500) | 0;
        /*if (nowSecond !== curSecond) {
            rendertime = framecount * 2;
            curSecond = nowSecond;
            framecount = 0;
        }
        framecount++;*/
        //performance.mark('renderloopStart');


        this.gpu.onRenders2.forEach(or => {
            const buff = or();
            if (buff)
            this.gpu.pendingCommandBuffers.add(buff);
        });
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

        this.gpu.device.queue.writeBuffer(this.gpu.timeBuffer, 0, this.#timeAndDeltaBuffer);
        try {
            this.cameras.forEach(camera => {
                camera.updateView(renderEncoder)
            })
            const lightPass = renderEncoder.beginComputePass();
            lightPass.setPipeline(this.gpu.updateViewPipeline);
            lightPass.setBindGroup(0, this.gpu.updateViewBindGroup);
            this.cameras.forEach(camera => {
                if(camera.viewUpdated || this.#updateLights) {
                    camera.viewUpdated=false;
                    lightPass.setBindGroup(1, camera.updateViewBindGroup);
                    lightPass.dispatch(...this.gpu.CLUSTER_DISPATCH_SIZE);
                }
            });
            lightPass.endPass();
            this.#updateLights = false;

            this.cameras.forEach(camera => {
                camera.renderPass.render(renderEncoder, camera.uniformBindGroup,this.gpu.rootCameralayout);
            });
        } catch (e) {
            console.error(e);
        }

        this.gpu.renderPassCanvas.render(renderEncoder, this.gpu.BindGroupCanvas, this.gpu.rootLayout);

        this.gpu.pendingCommandBuffers.add(renderEncoder.finish())
        this.gpu.device.queue.submit(this.gpu.pendingCommandBuffers);
        this.gpu.pendingCommandBuffers.clear();
        this.gpu.tempGPUBuffers.forEach(buff => buff.destroy())
        this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
    }
    constructor(
        public gpu: GPU,
        public DB: EarthDatabase,
        public canvas: HTMLCanvasElement,
        public wasm: ColliderWasm,
        public rust: rustWasm
    ) {
        this.memory = rust.memory;
        window.engine = this;
        const projection = new Projection(gpu);
        this.mainCamera = new TerraCamera(gpu.renderPassScreen, projection, gpu);


        this.collider = new ColliderJS(rust);
        this.attachCameraInput(true);

        const saveControllerState = () => {
            this.inputManager?.serialize();
        };
        document.addEventListener('visibilitychange', saveControllerState);
        window.addEventListener('beforeunload', saveControllerState);


        //TODO: this does not work after memory grow
        this.#collidedMesh = new DataView(this.memory.buffer, engine.rust.collided_mesh_pointer(this.collider.collider_ptr), 4);
        wasm.construct(engine.rust.collision_not_found_pointer(this.collider.collider_ptr),
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
        
        gpu.onRenders2.push(() => {
            GPUQueueCommandEncoder=null;
            engine.rust.handle_gpu_queue_rust();
            //@ts-ignore bug in TS
            return GPUQueueCommandEncoder?.finish() ?? null;
        });
        let resizeHandler = 0;
        const maxResolution = {
            width: 1920,
            height: 1080
        }
        const computePipelineClusters       = gpu.createComputePipeline('clusters.comp.wgsl');
        const computePipelineClustersLayout = computePipelineClusters.getBindGroupLayout(0)
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
                const commandEncoder = gpu.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipelineClusters);
                
                gpu.projections.forEach(projection => projection.update(aspectRatio))

                gpu.renderPasses.forEach(renderPass => {
                    renderPass.resize(canvas.width, canvas.height);
                    renderPass.cameras.forEach(camera => {
                        camera.updateProjection(passEncoder,computePipelineClustersLayout)
                    });
                });
                passEncoder.endPass();
                gpu.device.queue.submit([commandEncoder.finish()]);

                this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
            }, 500)
        });
        ro.observe(canvas.parentElement)
    }
    update_point_lights(pointer:number, length:number) {
        const lights = new Uint32Array(this.memory.buffer, pointer, length);
        console.log('lights',...lights)

        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = this.gpu.createGPUBuffer(byteLength, [GPUBufferUsage.COPY_SRC], true);
        const gpu_buffer=new Uint32Array(tempBuffer.getMappedRange());
        gpu_buffer[0] = lights.length;
        gpu_buffer.set(lights,1);
        tempBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.gpu.GPUPointLights, 0,
            byteLength)
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_directional_lights(pointer:number, length:number) {
        const lights = new Uint32Array(this.memory.buffer, pointer, length);
        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = this.gpu.createGPUBuffer(byteLength, [GPUBufferUsage.COPY_SRC], true);
        const gpu_buffer=new Uint32Array(tempBuffer.getMappedRange());
        gpu_buffer[0] = lights.length;
        gpu_buffer.set(lights,1);
        tempBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.gpu.GPUDirectionalLights, 0,
            byteLength)
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }

    collideWithWorld() {
        //TODO: Call only when camera position change
        const scaledPosition = this.collider.scaledPosition;
        const scaledVelocity = this.collider.scaledVelocity;



        for (let i = 0; i < 3; i++) {
            //TODO: really, here inside the loop?
            //TODO: Remove this JS initialize
            this.collider._initialize(scaledPosition, scaledVelocity, this.closeDistance);

            //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
            this.wasm._initialize();
            // this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

            // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
            this.physics.tickables.forEach(mesh => mesh.checkCollision(this.collider))

            const intersectionPoint = this.collider.intersectionPointWasm;
            this.#destinationPoint[0] = scaledPosition[0] + scaledVelocity[0];
            this.#destinationPoint[1] = scaledPosition[1] + scaledVelocity[1];
            this.#destinationPoint[2] = scaledPosition[2] + scaledVelocity[2];


            if (this.collider.collision_not_found) {
                //console.log('set finalposition',...this.#destinationPoint)

                this.collider.finalPosition.set(this.#destinationPoint);
                return;
            }
            //console.log('collision found')
            if (scaledVelocity[0] !== 0 || scaledVelocity[1] !== 0 || scaledVelocity[2] !== 0) {
                //this.collider._getResponse(position, velocity);
                // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
                let scale = this.collider.nearest_distance_squared / (scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2]);
                // let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
                scaledVelocity[0] *= scale;
                scaledVelocity[1] *= scale;
                scaledVelocity[2] *= scale;


                scaledPosition[0] += scaledVelocity[0];
                scaledPosition[1] += scaledVelocity[1];
                scaledPosition[2] += scaledVelocity[2];

                this.collider._slidePlaneNormal[0] = scaledPosition[0] - intersectionPoint[0];
                this.collider._slidePlaneNormal[1] = scaledPosition[1] - intersectionPoint[1];
                this.collider._slidePlaneNormal[2] = scaledPosition[2] - intersectionPoint[2];

                const length = Math.sqrt(this.collider._slidePlaneNormal[0] * this.collider._slidePlaneNormal[0] + this.collider._slidePlaneNormal[1] * this.collider._slidePlaneNormal[1] + this.collider._slidePlaneNormal[2] * this.collider._slidePlaneNormal[2]);
                if (!(length === 0 || length === 1.0)) {
                    const norm = 1 / length;
                    this.collider._slidePlaneNormal[0] *= norm;
                    this.collider._slidePlaneNormal[1] *= norm;
                    this.collider._slidePlaneNormal[2] *= norm;
                }

                // this._slidePlaneNormal.normalize();

                // this._slidePlaneNormal.scaleToRef(this._epsilon, this._displacementVector);
                this.#displacementVector[0] = this.collider._slidePlaneNormal[0] * this.collider.epsilon;
                this.#displacementVector[1] = this.collider._slidePlaneNormal[1] * this.collider.epsilon;
                this.#displacementVector[2] = this.collider._slidePlaneNormal[2] * this.collider.epsilon;

                // pos.addInPlace(this._displacementVector);
                scaledPosition[0] += this.#displacementVector[0];
                scaledPosition[1] += this.#displacementVector[1];
                scaledPosition[2] += this.#displacementVector[2];
                //this.intersectionPoint.addInPlace(this._displacementVector);
                intersectionPoint[0] += this.#displacementVector[0];
                intersectionPoint[1] += this.#displacementVector[1];
                intersectionPoint[2] += this.#displacementVector[2];

                const d = -(this.collider._slidePlaneNormal[0] * intersectionPoint[0] + this.collider._slidePlaneNormal[1] * intersectionPoint[1] + this.collider._slidePlaneNormal[2] * intersectionPoint[2]);
                scale = Dot(this.#destinationPoint, this.collider._slidePlaneNormal) + d;

                //this._destinationPoint.subtractInPlace(this._slidePlaneNormal);
                this.#destinationPoint[0] -= this.collider._slidePlaneNormal[0] * scale;
                this.#destinationPoint[1] -= this.collider._slidePlaneNormal[1] * scale;
                this.#destinationPoint[2] -= this.collider._slidePlaneNormal[2] * scale
                //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
                scaledVelocity[0] = this.#destinationPoint[0] - intersectionPoint[0];
                scaledVelocity[1] = this.#destinationPoint[1] - intersectionPoint[1];
                scaledVelocity[2] = this.#destinationPoint[2] - intersectionPoint[2];
            }

            // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
            if (scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2] <= this.closeDistanceSquared) {
                //finalPosition.copyFrom(position);
                this.collider.finalPosition.set(scaledPosition);
                return;
            }
        }
    }
}