import { Physics } from "./physics.js";
import type { GPU } from "./GPU.js";
import { TerraNodeGPU } from "./TerraNode.js";
import { Collider } from "./Collider.js";
import type { Scene } from "./Scene.js";
import { TerraVector3, Vector3 } from "./Math.js";
import init, {Engine as RustEngine } from "/js/engine/engine.js";
import { GPUBufferUsage } from "./GPU.js";

const CollisionsEpsilon = 0.001;
const closeDistance = CollisionsEpsilon * 10.0;
const closeDistanceSquared = closeDistance * closeDistance
export interface ColliderWasm {
    construct(collisionFound: number, intersectionPointer: number, nearestDistanceSquaredPointer:number, collidedMeshPointer:number):void;
    memory: {buffer: ArrayBuffer}
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: number, length: number, meshID:number) => void
    _initialize: (velocity:number, basePoint: number) => void
}
export interface ColliderWasmSIMD {
    construct(collisionFound: number, intersectionPointer: number, nearestDistanceSquaredPointer: number, collidedMeshPointer: number): void;
    memory: { buffer: ArrayBuffer }
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: number, planePositionHorizontal:number, length: number, meshID: number) => void
    _initialize: (velocity: number, basePoint: number) => void
}

export class Engine {
    freeMemoryBlocks: { byteOffset: number, byteLength: number }[] = []
    allocatedSize = 0;
    registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    physics = new Physics();
    scenes: Map<string, Scene> = new Map();
    
    #tempBuffer?: GPUCopySRCBuffer;
    collider = new Collider(this);

    mousePositionBuffer = new SharedArrayBuffer(4);
    mousePosition = new Uint16Array(this.mousePositionBuffer);

    mouseOffsetBuffer = new SharedArrayBuffer(8);
    
    
    malloc(byteLength: number): number {
        if (byteLength % 4 != 0) {
            throw ('malloc should be called with length divitable with four')
        }
        const available = this.freeMemoryBlocks.findIndex(arr => arr.byteLength == byteLength)
        if (available > -1)
            return this.freeMemoryBlocks.splice(available, 1)[0]!.byteOffset;
        else {
            const available2 = this.freeMemoryBlocks.find(arr => arr.byteLength < byteLength)
            if (available2) {
                const offset = available2.byteOffset;
                available2.byteOffset += byteLength;
                available2.byteLength -= byteLength;
                return offset;
            }
            const offset = this.allocatedSize;
            this.allocatedSize += byteLength;
            if (this.allocatedSize > this.wasm.memory.buffer.byteLength)
                throw('Out of memory')
            return offset;
        }
    }
    calloc(byteLength: number): number {
        const pointer = this.malloc(byteLength);
        new Uint8Array(this.wasm.memory.buffer, pointer, byteLength >> 2).fill(0)
        return pointer;
    }
    mallocView(byteLength: number): DataView {
        const pointer = this.malloc(byteLength);
        const dv = new DataView(this.wasm.memory.buffer, pointer, byteLength);
        this.registry.register(dv, { byteOffset: dv.byteOffset, byteLength: dv.byteLength });
        return dv;
    }
    callocVector3(): Vector3 {
        const arr = new TerraVector3(this.wasm.memory.buffer, this.malloc(16));
        arr.fill(0);
        this.registry.register(arr, { byteOffset: arr.byteOffset, byteLength: arr.byteLength });
        return arr;
    }
    mallocVector3(x?: number, y?: number, z?: number): Vector3 {
        const arr = new TerraVector3(this.wasm.memory.buffer, this.malloc(16));
        if(x)
            arr[0] = x;
        if(y)
            arr[1] = y;
        if(z)
            arr[2] = z;
        this.registry.register(arr, { byteOffset: arr.byteOffset, byteLength: arr.byteLength });
        return arr;
    }
    freeMemory(arr: { byteOffset: number, byteLength: number }) {
        const end = arr.byteOffset + arr.byteLength;
        if (end == this.allocatedSize) {
            this.allocatedSize = arr.byteOffset;
            const previousBlockIndex = this.freeMemoryBlocks.findIndex(parr => parr.byteOffset + parr.byteLength == arr.byteOffset)
            if (previousBlockIndex > -1) {
                this.allocatedSize = this.freeMemoryBlocks.splice(previousBlockIndex, 1)[0]!.byteOffset;
            }
            return;
        }
        queueMicrotask(() => {
            let byteLength = arr.byteLength;
            const nextBlock = this.freeMemoryBlocks.findIndex(arr => arr.byteOffset == end)
            if (nextBlock > -1) {
                byteLength += this.freeMemoryBlocks.splice(nextBlock, 1)[0]!.byteLength
            }
            let byteOffset = arr.byteOffset
            const previousBlockIndex = this.freeMemoryBlocks.findIndex(arr => arr.byteOffset + arr.byteLength == byteOffset)
            if (previousBlockIndex > -1) {
                const previousBlock = this.freeMemoryBlocks.splice(previousBlockIndex, 1)[0]!
                byteLength += previousBlock.byteLength
                byteOffset = previousBlock.byteOffset;
                return;
            }
            this.freeMemoryBlocks.push({ byteOffset, byteLength});
        })
    }

    static async initEngine(gpu: GPU, DB: Promise<EarthDatabase>, canvas: HTMLCanvasElement): Promise<Engine> {

        const memory = new WebAssembly.Memory({ initial: 600 });

        const wasmRequest = await fetch('collider/colliderO.wasm');
        const obj = await WebAssembly.instantiateStreaming(wasmRequest, {
            console: {
                log: function (arg: any) {
                    console.log(arg);
                }
            },
            env: {
                memory: memory
            }
        });
        const wasm: ColliderWasm = obj.instance.exports as any;
        /*
        const wasmRequestSIMD = await fetch('collider/colliderSIMDO.wasm');
        const objSIMD = await WebAssembly.instantiateStreaming(wasmRequestSIMD, {
            console: {
                log: function (arg: any) {
                    console.log(arg);
                }
            },
            env: {
                memory: memory
            }
        });*/
        const objSIMD = obj;
        const wasmSIMD: ColliderWasmSIMD = objSIMD.instance.exports as any;

        //Init rust wasm
        const rust = await init();
        return new Engine(gpu, DB, canvas, wasm, wasmSIMD, rust.memory, new RustEngine());
    }
    intersectionPointWasm = this.callocVector3()
    intersectionPointWasmSIMD = this.callocVector3()
    collisionNotFound = this.mallocView(4);
    collisionNotFoundSIMD = this.mallocView(4);
    nearestDistanceSquared = this.mallocView(4);
    nearestDistanceSquaredSIMD = this.mallocView(4);
    collidedMesh = this.mallocView(4);
    collidedMeshSIMD = this.mallocView(4);
    constructor(public gpu: GPU, public DB: Promise<EarthDatabase>, public canvas: HTMLCanvasElement, public wasm: ColliderWasm, public wasmSIMD: ColliderWasmSIMD, public memory: WebAssembly.Memory, public rustEngine: RustEngine) {

        wasm.construct(this.collisionNotFound.byteOffset, this.intersectionPointWasm.byteOffset, this.nearestDistanceSquared.byteOffset, this.collidedMesh.byteOffset)
      // wasmSIMD.construct(this.collisionNotFoundSIMD.byteOffset, this.intersectionPointWasmSIMD.byteOffset, this.nearestDistanceSquaredSIMD.byteOffset, this.collidedMeshSIMD.byteOffset)
      //  wasmSIMD.construct(this.collisionNotFound.byteOffset, this.intersectionPointWasm.byteOffset, this.nearestDistanceSquared.byteOffset, this.collidedMesh.byteOffset)

        //this.colliderWASM.getLowestRoot = wasm.getLowestRoot;
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX*gpu.scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY*gpu.scale.y)
            Atomics.notify(new Int32Array(this.mousePositionBuffer), 0);
        });
        gpu.onRenders2.push(() => {
            if (gpu.queue.size === 0)
                return null
            if (this.#tempBuffer)
                this.#tempBuffer.destroy();
            const dataSizeBytes = TerraNodeGPU.GPUDataSize * 4; //4 * 16 + 3 * 4;
            this.#tempBuffer = gpu.createGPUBuffer(dataSizeBytes * gpu.queue.size, [GPUBufferUsage.COPY_SRC], true);
            let tempOffset = 0;
            const commandEncoder = gpu.device.createCommandEncoder();
            gpu.queue.forEach((bufferOffset, matrix) => {
                new Float32Array(this.#tempBuffer!.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(matrix);
                commandEncoder.copyBufferToBuffer(
                    this.#tempBuffer!, tempOffset++ * dataSizeBytes,
                    gpu.GPUData, bufferOffset*256,
                    dataSizeBytes);
            });
            this.#tempBuffer.unmap();
            gpu.queue.clear();
            return commandEncoder.finish();
        })
    }
    collisionCoordinator = {
        scaledPosition: this.callocVector3(),
        scaledVelocity: this.callocVector3(),
        finalPosition: new TerraVector3(),
    }
    async collideWithWorld(position: Vector3, velocity: Vector3, maximumRetry: number, finalPosition: Float32Array/*, excludedMesh: Nullable<any> = null*/): Promise<void> {
        //TODO: Call only when camera position change
        
        if (this.collider._retry >= maximumRetry) {
            finalPosition[0] = position[0];
            finalPosition[1] = position[1];
            finalPosition[2] = position[2];
            // finalPosition.copyFrom(position);
            return;
        }

        // Check if this is a mesh else camera or -1
        //var collisionMask = (excludedMesh ? excludedMesh.collisionMask : collider.collisionMask);

        this.collider._initialize(position, velocity, closeDistance);

        //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
        this.wasm._initialize(velocity.byteOffset, position.byteOffset)
        this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

       // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
        await Promise.all([...this.gpu.boundables].map(mesh => mesh.checkCollision(this.collider)));
        if (this.collisionNotFound.getUint32(0,true)) {
        //    if (!this.collider.collisionFound) {

            //position.addToRef(velocity, finalPosition);
            finalPosition[0] = position[0] + velocity[0];
            finalPosition[1] = position[1] + velocity[1];
            finalPosition[2] = position[2] + velocity[2];
            return;
        }
        if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
            this.collider._getResponse(position, velocity);
        }

       // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
        if (velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2] <= closeDistanceSquared) {
            //finalPosition.copyFrom(position);
            finalPosition[0] = position[0];
            finalPosition[1] = position[1];
            finalPosition[2] = position[2];
            return;
        }
        this.collider._retry++;
        await this.collideWithWorld(position, velocity, maximumRetry, finalPosition);
    }
}