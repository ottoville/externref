import { Physics } from "./physics";
import type { GPU } from "./GPU";
import type { DynamicBindGroupLayout } from "./GPU/BindGroupLayout";
import { TerraNodeGPU } from "./TerraNode";
import { Collider } from "./Collider";
import { Scene } from "./Scene";
import { TerraVector3 } from "./Math";

export type Vector3 = Omit<TerraVector3, 'buffer'>;

const CollisionsEpsilon = 0.001;

export interface ColliderWasm {
    memory: {buffer: ArrayBuffer}
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: number, length: number, basePoint: number, velocityWasm: number) => void
    _initialize: (normalizedVelocity:number) => void
}


export class Engine {
    freeMemoryBlocks: { byteOffset: number, byteLength: number }[] = []
    allocatedSize = 0;
    physics = new Physics();
    scenes: Map<string, Scene> = new Map();
    positionBindGroupTime: DynamicBindGroupLayout<[number]>;
    calculatePickingRaysPipeline: TerraGPUComputePipeLine;
    bindgrouplayout1: GPUBindGroupLayout;
    #tempBuffer?: GPUCopySRCBuffer;
    collider = new Collider(this);

    mousePositionBuffer = new SharedArrayBuffer(4);
    #mousePosition = new Uint16Array(this.mousePositionBuffer);

    mouseOffsetBuffer = new SharedArrayBuffer(8);
    
    
    registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));
    malloc(byteLength: number): number {
        const available = this.freeMemoryBlocks.findIndex(arr => arr.byteLength == byteLength)
        if (available > -1)
            return this.freeMemoryBlocks.splice(available, 1)[0].byteOffset;
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
            return offset;
        }
    }
    callocVector3(): Vector3 {
        const arr = new TerraVector3(this.wasm.memory.buffer, this.malloc(16));
        arr.fill(0);
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
        console.log('freeMemory');
        const end = arr.byteOffset + arr.byteLength;
        if (end == this.allocatedSize) {
            this.allocatedSize = arr.byteOffset;
            const previousBlockIndex = this.freeMemoryBlocks.findIndex(parr => parr.byteOffset + parr.byteLength == arr.byteOffset)
            if (previousBlockIndex > -1) {
                this.allocatedSize = this.freeMemoryBlocks.splice(previousBlockIndex, 1)[0].byteOffset;
            }
            return;
        }
        queueMicrotask(() => {
            let byteLength = arr.byteLength;
            const nextBlock = this.freeMemoryBlocks.findIndex(arr => arr.byteOffset == end)
            if (nextBlock > -1) {
                byteLength += this.freeMemoryBlocks.splice(nextBlock, 1)[0].byteLength
            }
            let byteOffset = arr.byteOffset
            const previousBlockIndex = this.freeMemoryBlocks.findIndex(arr => arr.byteOffset + arr.byteLength == byteOffset)
            if (previousBlockIndex > -1) {
                const previousBlock = this.freeMemoryBlocks.splice(previousBlockIndex, 1)[0]
                byteLength += previousBlock.byteLength
                byteOffset = previousBlock.byteOffset;
                return;
            }
            this.freeMemoryBlocks.push({ byteOffset, byteLength});
        })
    }

    constructor(public gpu: GPU, public DB: Promise<EarthDatabase>, public canvas: HTMLCanvasElement, public wasm: ColliderWasm) {
        //this.colliderWASM.getLowestRoot = wasm.getLowestRoot;
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.#mousePosition, 0, e.clientX)
            Atomics.store(this.#mousePosition, 1, e.clientY)
            Atomics.notify(new Int32Array(this.mousePositionBuffer), 0);
        });
        this.positionBindGroupTime = gpu.rootSceneLayout.addChildBindGroup(gpu.BindGroup, true);
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
                    gpu.GPUData, bufferOffset,
                    dataSizeBytes);
            });
            this.#tempBuffer.unmap();
            gpu.queue.clear();
            //gpu.device.defaultQueue.submit([commandEncoder.finish()]);
           // return null
            return commandEncoder.finish();
        })
        const pickingRayLayout = gpu.createBindGroupLayout(
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                type: "readonly-storage-buffer"
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                type: "readonly-storage-buffer"
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                type: "storage-buffer"
            });
        this.calculatePickingRaysPipeline = gpu.createComputePipeline("calculatePickingRays.comp", gpu.device.createPipelineLayout({
            bindGroupLayouts: [pickingRayLayout]
        }));
        this.bindgrouplayout1 = gpu.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "storage-buffer"
                }]
        })
    }
    collisionCoordinator = {
        scaledPosition: this.callocVector3(),
        scaledVelocity: this.callocVector3(),
        finalPosition: new TerraVector3(),
    }
    async collideWithWorld(position: Vector3, velocity: Vector3, maximumRetry: number, finalPosition: Float32Array/*, excludedMesh: Nullable<any> = null*/): Promise<void> {
        /*
        await new Promise<void>(res => {
            setTimeout(() => { res(); }, 80);
        });
        
        */
        //TODO: Call only when camera position change
        var closeDistance = CollisionsEpsilon * 10.0;
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
        const scenesArr = [...this.scenes];
        this.collider.normalizedVelocityWasm.set(velocity)
        this.collider.normalizedVelocityWasm.normalize();

        this.wasm._initialize(this.collider.normalizedVelocityWasm.byteOffset)

       // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
        await Promise.all(scenesArr.map(scene => Promise.all([...scene[1].boundables].map(mesh => mesh.checkCollision(this.collider, position, velocity)))));
        if (!this.collider.collisionFound) {

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
        if (velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2] <= closeDistance) {
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