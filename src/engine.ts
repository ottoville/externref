import { Physics } from "./physics.js";
import type { GPU } from "./GPU.js";
import { TerraNodeGPU } from "./TerraNode.js";
import { ColliderJS } from "./Collider.js";
import type { Scene } from "./Scene.js";
import { TerraVector3, Vector3 } from "./Math.js";
import init, { Engine as RustEngine } from "/js/engine/engine.js";
import { GPUBufferUsage } from "./GPU.js";


function Dot(left: [number, number, number] | Float32Array | Vector3, right: [number, number, number] | Float32Array | Vector3): number {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}

export interface ColliderWasm {
    construct(collisionFound: number, intersectionPointer: number, nearestDistanceSquaredPointer: number, collidedMeshPointer: number, velocity: number, basePoint: number): void;
    memory: { buffer: ArrayBuffer }
    getLowestRoot: (a: number, b: number, c: number, maxR: number) => number
    testTriangles: (position: number, positionParallel:number, length: number, meshID: number) => void
    _initialize: () => void
}
export class Engine {
    readonly CollisionsEpsilon = 0.001;
    readonly closeDistance = this.CollisionsEpsilon * 10.0;
    readonly closeDistanceSquared = this.closeDistance * this.closeDistance

    freeMemoryBlocks: { byteOffset: number, byteLength: number }[] = []
    allocatedSize = 0;
    registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

    physics = new Physics();
    scenes: Map<string, Scene> = new Map();

    
    readonly collisionCoordinator:{
        scaledPosition: Vector3;
        scaledVelocity: Vector3;
        finalPosition: TerraVector3;
    }
    readonly collisionNotFound:DataView
    readonly #collidedMesh:DataView
    readonly collider:ColliderJS;

    mousePositionBuffer = new SharedArrayBuffer(4);
    mousePosition = new Uint16Array(this.mousePositionBuffer);

    mouseOffsetBuffer = new SharedArrayBuffer(8);
    destinationPoint: [number, number, number] = [0, 0, 0];
    displacementVector: [number, number, number] = [0, 0, 0];

    updateLights=false;
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
                throw ('Out of memory')
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
        if (x)
            arr[0] = x;
        if (y)
            arr[1] = y;
        if (z)
            arr[2] = z;
        this.registry.register(arr, { byteOffset: arr.byteOffset, byteLength: arr.byteLength });
        return arr;
    }
    freeMemory(arr: { byteOffset: number, byteLength: number }) {
        return;
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
            this.freeMemoryBlocks.push({ byteOffset, byteLength });
        })
    }

    static async initEngine(gpu: GPU, DB: Promise<EarthDatabase>, canvas: HTMLCanvasElement): Promise<Engine> {

        const memory = new WebAssembly.Memory({ initial: 6000 });

        const wasmRequest = await fetch('collider/colliderO.wasm');
        const obj = await WebAssembly.instantiateStreaming(wasmRequest, {
            console: {
                log: function (arg: string) {
                    console.log(arg);
                }
            },
            env: {
                memory: memory
            }
        });
        const wasm: ColliderWasm = obj.instance.exports as any;

        //Init rust wasm
        const rust = await init();
        return new Engine(gpu, DB, canvas, wasm, rust.memory, new RustEngine());
    }
    constructor(public gpu: GPU, public DB: Promise<EarthDatabase>, public canvas: HTMLCanvasElement, public wasm: ColliderWasm, public memory: WebAssembly.Memory, public rustEngine: RustEngine) {
        window.engine=this;
        this.collisionNotFound = this.mallocView(4);
        this.#collidedMesh = this.mallocView(4);

        this.collisionCoordinator = {
            scaledPosition: this.callocVector3(),
            scaledVelocity: this.callocVector3(),
            finalPosition: new TerraVector3(),
        }

        this.collider = new ColliderJS(this,this.collisionCoordinator,this.collisionNotFound);

        wasm.construct( this.collisionNotFound.byteOffset,
                        this.collider.intersectionPointWasm.byteOffset,
                        this.collider.nearestDistanceSquared.byteOffset,
                        this.#collidedMesh.byteOffset,
                        this.collisionCoordinator.scaledVelocity.byteOffset,
                        this.collisionCoordinator.scaledPosition.byteOffset)


        //this.colliderWASM.getLowestRoot = wasm.getLowestRoot;
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX * gpu.scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * gpu.scale.y)
            Atomics.notify(new Int32Array(this.mousePositionBuffer), 0);
        });
        gpu.onRenders2.push(() => {
            const dataSizeBytes = TerraNodeGPU.GPUDataSize * 4; //4 * 16 + 3 * 4;
            const pointers=this.rustEngine.gpu_queue_pointer;
            if(pointers.length === 0)
                return null;
            const queueLength=pointers.length/2;
            const tempBuffer = gpu.createGPUBuffer(dataSizeBytes * queueLength, [GPUBufferUsage.COPY_SRC], true);
            const commandEncoder = gpu.device.createCommandEncoder();
            let tempOffset = 0;
            for(let i=0;i<pointers.length;i+=2) {
                const data=new Float32Array(this.memory.buffer, pointers[i], TerraNodeGPU.GPUDataSize);
                //Point light
                if(data[29]! > 0) {
                    this.updateLights=true;
                }
                new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(data);
                commandEncoder.copyBufferToBuffer(
                    tempBuffer, tempOffset++ * dataSizeBytes,
                    gpu.GPUMeshes, gpu.gpu_memory_index_size + pointers[i+1]! * 256,
                    dataSizeBytes);
            }
            this.rustEngine.clear_gpu_queue();
            tempBuffer.unmap();
            this.gpu.tempGPUBuffers.add(tempBuffer);
            return commandEncoder.finish();
        })
    }
    update_point_lights(lights: Uint32Array) {
        const commandEncoder = this.gpu.device.createCommandEncoder();
         //TODO: Potential buffer overflow
        this.gpu.updateBufferRaw(commandEncoder,this.gpu.GPUPointLights,new Uint32Array([lights.length, ...lights]).buffer);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_directional_lights(lights: Uint32Array) {
        const commandEncoder = this.gpu.device.createCommandEncoder();
         //TODO: Potential buffer overflow
        this.gpu.updateBufferRaw(commandEncoder,this.gpu.GPUDirectionalLights,new Uint32Array([lights.length, ...lights]).buffer);
        this.gpu.pendingCommandBuffers.add(commandEncoder.finish());
    }
    public updateAllocatedMemory() {
        const renderEncoder = this.gpu.device.createCommandEncoder();
        const allocated=this.rustEngine.allocated_gpu_memory;
        const buffLength=Uint32Array.BYTES_PER_ELEMENT + allocated.byteLength;
        const tempBuffer = this.gpu.createGPUBuffer(buffLength, [GPUBufferUsage.COPY_SRC], true);
        new Uint32Array(tempBuffer.getMappedRange(0,buffLength)).set([allocated.length, ...allocated]);
        tempBuffer.unmap();

        renderEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            this.gpu.GPUMeshes, 0,
            buffLength);
        this.gpu.pendingCommandBuffers.add(renderEncoder.finish())
    }
    async collideWithWorld(): Promise<void> {
        //TODO: Call only when camera position change
        for (let i = 0; i < 3; i++) {
            // Check if this is a mesh else camera or -1
            //var collisionMask = (excludedMesh ? excludedMesh.collisionMask : collider.collisionMask);

            //this.collider._initialize(this.collisionCoordinator.scaledPosition, this.collisionCoordinator.scaledVelocity, this.closeDistance);

            //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
            this.wasm._initialize()
            // this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

            // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
            await Promise.all([...this.gpu.boundables].map(mesh => mesh.checkCollision(this.collider)));


            this.destinationPoint[0] = this.collisionCoordinator.scaledPosition[0] + this.collisionCoordinator.scaledVelocity[0];
            this.destinationPoint[1] = this.collisionCoordinator.scaledPosition[1] + this.collisionCoordinator.scaledVelocity[1];
            this.destinationPoint[2] = this.collisionCoordinator.scaledPosition[2] + this.collisionCoordinator.scaledVelocity[2];
            

            if (this.collisionNotFound.getUint32(0, true)) {
                this.collisionCoordinator.finalPosition.set(this.destinationPoint);
                return;
            }
            if (this.collisionCoordinator.scaledVelocity[0] !== 0 || this.collisionCoordinator.scaledVelocity[1] !== 0 || this.collisionCoordinator.scaledVelocity[2] !== 0) {
                //this.collider._getResponse(position, velocity);
                // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
                let scale = this.collider.nearestDistanceSquared.getFloat32(0, true) / (this.collisionCoordinator.scaledVelocity[0] * this.collisionCoordinator.scaledVelocity[0] + this.collisionCoordinator.scaledVelocity[1] * this.collisionCoordinator.scaledVelocity[1] + this.collisionCoordinator.scaledVelocity[2] * this.collisionCoordinator.scaledVelocity[2]);
                // let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
                this.collisionCoordinator.scaledVelocity[0] *= scale;
                this.collisionCoordinator.scaledVelocity[1] *= scale;
                this.collisionCoordinator.scaledVelocity[2] *= scale;

                this.collisionCoordinator.scaledPosition[0] += this.collisionCoordinator.scaledVelocity[0];
                this.collisionCoordinator.scaledPosition[1] += this.collisionCoordinator.scaledVelocity[1];
                this.collisionCoordinator.scaledPosition[2] += this.collisionCoordinator.scaledVelocity[2];

                this.collider._slidePlaneNormal[0] = this.collisionCoordinator.scaledPosition[0] - this.collider.intersectionPointWasm[0];
                this.collider._slidePlaneNormal[1] = this.collisionCoordinator.scaledPosition[1] - this.collider.intersectionPointWasm[1];
                this.collider._slidePlaneNormal[2] = this.collisionCoordinator.scaledPosition[2] - this.collider.intersectionPointWasm[2];

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
                this.collisionCoordinator.scaledPosition[0] += this.displacementVector[0];
                this.collisionCoordinator.scaledPosition[1] += this.displacementVector[1];
                this.collisionCoordinator.scaledPosition[2] += this.displacementVector[2];
                //this.intersectionPoint.addInPlace(this._displacementVector);
                this.collider.intersectionPointWasm[0] += this.displacementVector[0];
                this.collider.intersectionPointWasm[1] += this.displacementVector[1];
                this.collider.intersectionPointWasm[2] += this.displacementVector[2];

                const d = -(this.collider._slidePlaneNormal[0] * this.collider.intersectionPointWasm[0] + this.collider._slidePlaneNormal[1] * this.collider.intersectionPointWasm[1] + this.collider._slidePlaneNormal[2] * this.collider.intersectionPointWasm[2]);
                scale = Dot(this.destinationPoint, this.collider._slidePlaneNormal) + d;

                //this._destinationPoint.subtractInPlace(this._slidePlaneNormal);
                this.destinationPoint[0] -= this.collider._slidePlaneNormal[0] * scale;
                this.destinationPoint[1] -= this.collider._slidePlaneNormal[1] * scale;
                this.destinationPoint[2] -= this.collider._slidePlaneNormal[2] * scale
                //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
                this.collisionCoordinator.scaledVelocity[0] = this.destinationPoint[0] - this.collider.intersectionPointWasm[0];
                this.collisionCoordinator.scaledVelocity[1] = this.destinationPoint[1] - this.collider.intersectionPointWasm[1];
                this.collisionCoordinator.scaledVelocity[2] = this.destinationPoint[2] - this.collider.intersectionPointWasm[2];
            }

            // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
            if (this.collisionCoordinator.scaledVelocity[0] * this.collisionCoordinator.scaledVelocity[0] + this.collisionCoordinator.scaledVelocity[1] * this.collisionCoordinator.scaledVelocity[1] + this.collisionCoordinator.scaledVelocity[2] * this.collisionCoordinator.scaledVelocity[2] <= this.closeDistanceSquared) {
                //finalPosition.copyFrom(position);
                this.collisionCoordinator.finalPosition[0] = this.collisionCoordinator.scaledPosition[0];
                this.collisionCoordinator.finalPosition[1] = this.collisionCoordinator.scaledPosition[1];
                this.collisionCoordinator.finalPosition[2] = this.collisionCoordinator.scaledPosition[2];
                return;
            }
        }
    }
}