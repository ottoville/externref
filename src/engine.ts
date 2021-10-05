import { Physics } from "./physics.js";
import { GPU } from "./GPU.js";
import { TerraNodeGPU } from "./TerraNode.js";
import { ColliderJS } from "./Collider.js";
import type { Scene } from "./Scene.js";
import type { TerraVector3 } from "./Math.js";
import { Uint16Vector2 } from "./Math.js";
import init, { Engine as RustEngine } from "/js/engine/engine.js";
import { GPUBufferUsage } from "./GPU.js";
import { TerraCamera } from "./TerraCamera.js";
import { Projection } from "./GPU/Projection.js";
//@ts-ignore
import { PositionCamera } from "./controllers/PositionCamera.js";
//@ts-ignore
import { ArcRotateCamera } from "./controllers/ArcRotateCamera.js";
import { BoundableNode } from "./DataNode.js";
//@ts-ignore
import { MeshCamera } from "./controllers/MeshCamera.js";


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
    readonly boundables: Map<string,BoundableNode> = new Map();

    readonly CollisionsEpsilon = 0.001;
    readonly closeDistance = this.CollisionsEpsilon * 10.0;
    readonly closeDistanceSquared = this.closeDistance * this.closeDistance

    // registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    physics = new Physics();
    scenes: Map<string, Scene> = new Map();
    // readonly collisionNotFound:DataView
    //@ts-ignore
    readonly #collidedMesh: DataView
    readonly collider: ColliderJS;

    mousePositionBuffer = new SharedArrayBuffer(4);
    mousePosition = new Uint16Vector2(this.mousePositionBuffer);

    mouseOffsetBuffer = new SharedArrayBuffer(8);
    #destinationPoint: [number, number, number] = [0, 0, 0];
    displacementVector: [number, number, number] = [0, 0, 0];

    updateLights = false;
    mainCamera: TerraCamera;
    inputManager: CameraController | null = null
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
            'updateView.comp.wgsl'
        ];
        await Promise.all(shaders.map(async u => {
            const compiled = await (await fetch('/shaders/wgsl/' + u)).text();
            shaderModules.set(u, device.createShaderModule({ code: compiled }));
        }));
        const gpu = new GPU(canvas, device, shaderModules);
        //@ts-ignore
        window.printRenderTarget = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetNormals.texture.toBitmap(0)
        }
        //@ts-ignore
        window.printRenderTarget3 = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetDiffuse.texture.toBitmap(0)
        }
        //Init rust wasm
        const rust = await init();

        const obj = await WebAssembly.instantiateStreaming(await fetch('collider/colliderO.wasm'), {
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
                memory: rust.memory
            }
        });
        const wasm: ColliderWasm = obj.instance.exports as any;

        return new Engine(gpu, await DB, canvas, wasm, rust.memory, new RustEngine());
    }
    attachCameraInput(initial = false) {
    this.inputManager = new ArcRotateCamera(this.mainCamera, initial);
       //  this.inputManager = new PositionCamera(this.mainCamera,initial);
    }
    constructor(
        public gpu: GPU,
        public DB: EarthDatabase,
        public canvas: HTMLCanvasElement,
        public wasm: ColliderWasm,
        public memory: WebAssembly.Memory,
        public rustEngine: RustEngine
    ) {
        window.engine = this;
        const projection = new Projection(gpu);
        this.mainCamera = new TerraCamera(gpu.renderPassScreen, projection, gpu);


        this.collider = new ColliderJS();
        this.attachCameraInput(true);

        const saveControllerState = () => {
            this.inputManager?.serialize();
        };
        document.addEventListener('visibilitychange', saveControllerState);
        window.addEventListener('beforeunload', saveControllerState);


        //TODO: this does not work after memory grow
        this.#collidedMesh = new DataView(this.memory.buffer, this.collider.rust.collided_mesh_pointer, 4);
        wasm.construct(this.collider.rust.collision_not_found_pointer,
            this.collider.rust.intersection_point_pointer,
            this.collider.rust.nearest_distance_squared_pointer,
            this.collider.rust.collided_mesh_pointer,
            this.collider.rust.scaled_velocity_pointer,
            this.collider.rust.scaled_position_pointer)


        //this.colliderWASM.getLowestRoot = wasm.getLowestRoot;
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX * gpu.scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * gpu.scale.y)
            Atomics.notify(new Int32Array(this.mousePositionBuffer), 0);
        });
        const map = new Map<number, number>();

        gpu.onRenders2.push(() => {
            const dataSizeBytes = TerraNodeGPU.GPUDataSize * 4; //4 * 16 + 3 * 4;
            const pointers2 = this.rustEngine.get_gpu_queue_raw_parts_ptr;
            const vec_and_len = new Uint32Array(this.memory.buffer, pointers2, 2);
            if (vec_and_len[1] === 0)
                return null;
            const pointers_to_gpumesh_and_alignment = new Uint32Array(this.memory.buffer, vec_and_len[0], vec_and_len[1]! * 2);
            for (let i = 0; i < pointers_to_gpumesh_and_alignment.length; i += 2) {
                map.set(pointers_to_gpumesh_and_alignment[i]!, pointers_to_gpumesh_and_alignment[i + 1]!);
            }
            const tempBuffer = gpu.createGPUBuffer(dataSizeBytes * map.size, [GPUBufferUsage.COPY_SRC], true);
            const commandEncoder = gpu.device.createCommandEncoder();
            let tempOffset = 0;
            map.forEach((alignment, gpumeshPointer) => {
                const data = new Float32Array(this.memory.buffer, gpumeshPointer, TerraNodeGPU.GPUDataSize);
                //Point light
                if (data[29]! > 0) {
                    this.updateLights = true;
                }
                new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(data);
                commandEncoder.copyBufferToBuffer(
                    tempBuffer, tempOffset++ * dataSizeBytes,
                    gpu.GPUMeshes, gpu.gpu_memory_index_size + alignment * 256,
                    dataSizeBytes);
            });
            map.clear();
            this.rustEngine.clear_gpu_queue();
            tempBuffer.unmap();
            this.gpu.tempGPUBuffers.add(tempBuffer);
            return commandEncoder.finish();
        })
    }
    update_point_lights(lights: Uint32Array) {
        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        this.gpu.updateBufferRaw(commandEncoder, this.gpu.GPUPointLights, new Uint32Array([lights.length, ...lights]).buffer);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_directional_lights(lights: Uint32Array) {
        const commandEncoder = this.gpu.device.createCommandEncoder();
        //TODO: Potential buffer overflow
        this.gpu.updateBufferRaw(commandEncoder, this.gpu.GPUDirectionalLights, new Uint32Array([lights.length, ...lights]).buffer);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    public updateAllocatedMemory() {
        const renderEncoder = this.gpu.device.createCommandEncoder();
        const allocated = this.rustEngine.allocated_gpu_memory;
        const buffLength = Uint32Array.BYTES_PER_ELEMENT + allocated.byteLength;
        const tempBuffer = this.gpu.createGPUBuffer(buffLength, [GPUBufferUsage.COPY_SRC], true);
        new Uint32Array(tempBuffer.getMappedRange(0, buffLength)).set([allocated.length, ...allocated]);
        tempBuffer.unmap();

        renderEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.gpu.GPUMeshes, 0,
            buffLength);
        this.gpu.pendingCommandBuffers.add(renderEncoder.finish())
    }
    async collideWithWorld(): Promise<void> {
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
            await Promise.all([...this.boundables.values()].map(mesh => mesh.checkCollision(this.collider)));

            const intersectionPoint = this.collider.intersectionPointWasm;
            this.#destinationPoint[0] = scaledPosition[0] + scaledVelocity[0];
            this.#destinationPoint[1] = scaledPosition[1] + scaledVelocity[1];
            this.#destinationPoint[2] = scaledPosition[2] + scaledVelocity[2];


            if (this.collider.rust.collision_not_found) {
                this.collider.finalPosition.set(this.#destinationPoint);
                return;
            }
            //console.log('collision found')
            if (scaledVelocity[0] !== 0 || scaledVelocity[1] !== 0 || scaledVelocity[2] !== 0) {
                //this.collider._getResponse(position, velocity);
                // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
                let scale = this.collider.rust.nearest_distance_squared / (scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2]);
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
                this.displacementVector[0] = this.collider._slidePlaneNormal[0] * this.collider.epsilon;
                this.displacementVector[1] = this.collider._slidePlaneNormal[1] * this.collider.epsilon;
                this.displacementVector[2] = this.collider._slidePlaneNormal[2] * this.collider.epsilon;

                // pos.addInPlace(this._displacementVector);
                scaledPosition[0] += this.displacementVector[0];
                scaledPosition[1] += this.displacementVector[1];
                scaledPosition[2] += this.displacementVector[2];
                //this.intersectionPoint.addInPlace(this._displacementVector);
                intersectionPoint[0] += this.displacementVector[0];
                intersectionPoint[1] += this.displacementVector[1];
                intersectionPoint[2] += this.displacementVector[2];

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