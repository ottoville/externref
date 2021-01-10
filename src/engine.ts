import { Physics } from "./physics";
import type { GPU } from "./GPU";
import type { DynamicBindGroupLayout } from "./GPU/BindGroupLayout";
import { TerraNode } from "./TerraNode";
import { Collider } from "./Collider";
import { Scene } from "./Scene";
import { TerraVector3 } from "./Math";

const CollisionsEpsilon = 0.001;

export class Engine {
    physics = new Physics();
    scenes: Map<string, Scene> = new Map();
    positionBindGroupTime: DynamicBindGroupLayout<[number]>;
    calculatePickingRaysPipeline: TerraGPUComputePipeLine;
    bindgrouplayout1: GPUBindGroupLayout;
    #tempBuffer?: GPUCopySRCBuffer;
    collider = new Collider();
    colliderWASM = new Collider();

    mousePositionBuffer = new SharedArrayBuffer(4);
    #mousePosition = new Uint16Array(this.mousePositionBuffer);

    mouseOffsetBuffer = new SharedArrayBuffer(8);
    

    constructor(public gpu: GPU, public DB: Promise<EarthDatabase>, public canvas: HTMLCanvasElement, public wasm: { getLowestRoot: (a: number, b: number, c: number, maxR: number) => number }) {
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
            const dataSizeBytes = TerraNode.GPUDataSize * 4; //4 * 16 + 3 * 4;
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
        scaledPosition: new TerraVector3(),
        scaledVelocity: new TerraVector3(),
        finalPosition: new TerraVector3(),
    }
    async collideWithWorld(position: TerraVector3, velocity: TerraVector3, maximumRetry: number, finalPosition: Float32Array/*, excludedMesh: Nullable<any> = null*/): Promise<void> {
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
        const scenesArr=[...this.scenes]

        await Promise.all(scenesArr.map(scene => Promise.all([...scene[1].boundables].map(mesh =>mesh.checkCollision(this.collider)))));
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