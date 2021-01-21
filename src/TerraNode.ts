import { Collider } from "./Collider";
import { Engine, Vector3 } from "./engine";

import type { isLight } from "./lights";
import { TerraMatrix, TerraVector4, Triangle } from "./Math";
import type { hasPhysics } from "./physics";
import type { Scene } from "./Scene";
import { worldPosition } from "./traits/worldPosition";
import { ObjectWorkerThread } from "./WorkerThread";
import { TerraVector3 } from "./Math";
import { RenderPipeline } from "./GPU/RenderPipeline";
import { Drawable } from "./GPU/Drawable";

export abstract class MainNode {
    readonly bufferOffsetBytes: number;

    readonly data: Float32Array;
    readonly customData: Float32Array;
    abstract worldPosition?: worldPosition
    constructor(public engine: Engine, bufferOffsetBytes?: number) {
        bufferOffsetBytes = typeof (bufferOffsetBytes) == "number" ? bufferOffsetBytes : engine.gpu.DataSlots.pop();
        if (typeof (bufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.bufferOffsetBytes = bufferOffsetBytes;
        this.data = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes, TerraNodeGPU.GPUDataSize);
        this.customData = new Float32Array(this.engine.gpu.CPUData, bufferOffsetBytes + 20 * 4, 4);


        //engine.gpu.NodeInstances.set(this, engine.gpu.NodeInstances.size * TerraNodeGPU.alignment);
        this.data.set([
            //3d matrix start, 64 bytes
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
            //3d matrix end
            //delta start, 12 bytes + alignment 4 byte
            0, 0, 0, 0,
            //delta end
            //custom data start, 16 bytes
            0, 0, 0, 0
            //custom data end
        ])
        queueMicrotask(() => {
            if (this.hasPhysics()) {
                engine.physics.tickables.add(this);
            }
            if (this.isLight()) {
                //scene.lights.add(this);
            }
        });
        this.updateDynamicBuffer();

    }

    async updateDynamicBuffer() {
        this.engine.gpu.queue.set(this.data, this.bufferOffsetBytes);
    }

    hasPhysics(): this is hasPhysics {
        return 'worldPosition' in this && 'onPhysicTick' in this;
    }
    isLight(): this is isLight {
        return 'lightType' in this;
    }
}
export abstract class TerraNodeGPU extends MainNode implements Partial<hasPhysics>{
    static uniqueID = 0;
    protected readonly uniqueID: number = TerraNodeGPU.uniqueID++;
    
    abstract Drawable:Drawable
    static GPUDataSize = 16 + 4 + 4
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader

    //readonly dataBuffer = new ArrayBuffer(TerraNode.GPUDataSize);

    destroy() {
        //this.engine.gpu.NodeInstances.delete(this);
    }

    constructor(public engine: Engine, public renderPipeline: RenderPipeline, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes)
    }

}
export interface PickingInfo {
    hit: boolean,
    pickedPoint: { x: number, y: number, z: number },
    pickedMesh: BoundableNode,
    distance: number
}
const worker = new ObjectWorkerThread('/webworkers/mesh.js');

class pickInfo {
    buffer = new SharedArrayBuffer(6 * 4);
    point = new TerraVector3(this.buffer);
    distance = new Float32Array(this.buffer, 3 * 4, 1);
}
class boundingBox {
    buffer = new SharedArrayBuffer(4 * 6);
    box = new Float32Array(this.buffer);
    min = new TerraVector3(this.buffer, 0);
    max = new TerraVector3(this.buffer, 4 * 3);
}

export abstract class BoundableNode extends TerraNodeGPU {
   

    readonly boundingBox = new boundingBox();
    readonly pickInfo = new pickInfo();


    #colliderVertices: TerraVector3[] = [];

    #lastColliderWorldVectors = new SharedArrayBuffer(this.verticesPositionBuffer.byteLength);
    #lastColliderWorldVectorsView2: TerraVector3[] = [];

    #faces: Triangle[];
    #lastColliderTransformMatrix = new TerraMatrix();

    verticesCount: number;
    facesBuffer: SharedArrayBuffer;
    //facesBufferCollider: ArrayBuffer;
    normalizedVelocityDotBuffer: GPUStorageBuffer & GPUCopySRCBuffer;
    normalizedVelocityDotBufferRead: GPUMapReadBuffer & GPUCopyDSTBuffer;
    sourceBindGroup: GPUBindGroup;
    facesGPUBufferCollide: GPUStorageBuffer & GPUCopyDSTBuffer;
    normalizedVelocityBuffer: GPUStorageBuffer & GPUCopyDSTBuffer;
    facesBufferColliderPointer: number;
    addVectors(faceIndex: number, vectors: [TerraVector3, TerraVector3, TerraVector3]) {
        try {
            const t = new Triangle(
                vectors as [TerraVector3, TerraVector3, TerraVector3],
                new TerraVector4(this.facesBuffer, faceIndex * 4 * 4),
                new TerraVector4(this.engine.wasm.memory.buffer, this.facesBufferColliderPointer + faceIndex * 4 * 4)
               // new TerraVector4(this.facesBufferCollider, faceIndex * 4 * 4)
            );
            this.#faces[faceIndex] = t;
        } catch (e) {
            console.log(e);
            debugger;
        }
    }
    rebuildTrianglePlanes() {
        let vectors: TerraVector3[] = [];
        let faceIndex = 0;
        if (this.indicesView) {
            if (this.strip) {
                this.indicesView.forEach((indice:number) => {
                    let vector = this.#lastColliderWorldVectorsView2[indice];
                    if (!vector) {
                        debugger;

                        throw ('position not found');
                    }
                    if (vectors.push(vector) < 3)
                        return;
                    this.addVectors(faceIndex++, vectors as [TerraVector3, TerraVector3, TerraVector3]);
                    vectors = [vectors[1], vectors[2]];
                });
            } else {
                this.indicesView.forEach((indice: number) => {
                    //const position = this.#lastColliderWorldVectorsViewIndexed.get(indice);
                    const position = this.#colliderVertices[indice]
                    if (!position) {
                        debugger;
                        throw ('position ' + indice + ' not found');
                    }
                    if (vectors.push(position) == 3) {
                        this.addVectors(faceIndex++, vectors as [TerraVector3, TerraVector3, TerraVector3])
                        vectors = [];
                    }
                });
            }
        } else {
            if (this.strip) {
                this.#lastColliderWorldVectorsView2.forEach(vector => {
                    if (vectors.push(vector) < 3)
                        return;
                    this.addVectors(faceIndex++, vectors as [TerraVector3, TerraVector3, TerraVector3])
                    vectors = [vectors[1], vectors[2]];
                });
            } else {
                this.#lastColliderWorldVectorsView2.forEach(vector => {
                    if (vectors.push(vector) == 3) {
                        this.addVectors(faceIndex++, vectors as [TerraVector3, TerraVector3, TerraVector3])
                        vectors = [];
                    }
                });
            }
        }
    }

    set indices(indices: ArrayLike<number>) {
        if (this.indicesView) {
            this.indicesView.set(indices);
        } else {
            this.indicesView = new Uint32Array(indices);
        }
        this.rebuildTrianglePlanes();
    }
    constructor(
        scene: Scene,
        renderPipeline: RenderPipeline,
        public verticesPositionBuffer: SharedArrayBuffer,
        public verticesPositionStride: number = 3,
        private indicesView?: Uint32Array | Uint16Array,        
        private strip = false,
        
    ) {
        super(scene.engine, renderPipeline);
        const positionCount = (this.verticesPositionBuffer.byteLength / 4) / this.verticesPositionStride;
        this.verticesCount = indicesView ? indicesView.length : positionCount;

        if (this.strip) {
            this.#faces = new Array(this.verticesCount - 2)
            this.facesBuffer = new SharedArrayBuffer((this.verticesCount - 2) * 4 * 4);
        }
        else {
            this.#faces = new Array(this.verticesCount / 3);
            this.facesBuffer = new SharedArrayBuffer((this.verticesCount / 3) * 4 * 4);
        }
        this.facesBufferColliderPointer = scene.engine.malloc(this.facesBuffer.byteLength);

        //this.facesBufferCollider = new ArrayBuffer(this.facesBuffer.byteLength);
        scene.boundables.add(this);
        for (let i = 0; i < positionCount; i++) {
            this.#colliderVertices.push(new TerraVector3(this.#lastColliderWorldVectors, i * verticesPositionStride * 4));
        }
        if (!indicesView) {
            for (let i = 0; i < this.verticesCount; i++) {
                this.#lastColliderWorldVectorsView2.push(new TerraVector3(this.#lastColliderWorldVectors, i * verticesPositionStride * 4));
            }
        }
        this.rebuildTrianglePlanes();

            //Run this on microtask so the scope who called
            //constuctor has time to add verticesPositionBuffer and indicesbuffer property.

        queueMicrotask(() => {
            worker.message(this.uniqueID, 'init', [indicesView?.buffer, this.verticesPositionBuffer, this.verticesPositionStride, this.boundingBox.buffer, this.pickInfo.buffer])
        });


        this.facesGPUBufferCollide = this.engine.gpu.createGPUBuffer(this.facesBuffer.byteLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]);
        this.normalizedVelocityBuffer = this.engine.gpu.createGPUBuffer(3 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]);
        this.normalizedVelocityDotBuffer = this.engine.gpu.createGPUBuffer(this.#faces.length * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
        this.normalizedVelocityDotBufferRead = this.engine.gpu.createGPUBuffer(this.#faces.length * 4, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ]);
        this.sourceBindGroup = this.engine.gpu.device.createBindGroup({
            layout: this.engine.gpu.device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        type: "readonly-storage-buffer"
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        type: "storage-buffer"
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        type: "storage-buffer"
                    }
                ]
            }),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.facesGPUBufferCollide
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.normalizedVelocityBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.normalizedVelocityDotBuffer
                    }
                }
            ]
        });

    }
    public intersectsRay(ray: Float32Array): Promise<void> {
        return worker.message(this.uniqueID, 'intersectsRay', [ray.buffer]);
    }
    public updateBoundingBoxByMatrix(m: TerraMatrix) {
        //TODO: Use SIMD
        this.boundingBox.min.multiply(m);
        this.boundingBox.max.multiply(m);
    }
    //collisionsScalingMatrix = new TerraMatrix();
    myCollisionsTransformMatrix = new TerraMatrix();
    public async checkCollision(collider: Collider, basePoint: Vector3, VelocityWasm: Vector3) {
        if (!collider._canDoCollision(this.boundingBox.min, this.boundingBox.max)) {
            return;
        }
        // Transformation matrix
        this.myCollisionsTransformMatrix = collider.collisionsScalingMatrix.clone();

        if (this.worldPosition)
            this.worldPosition.worldMatrix.multiplyToRef(this.myCollisionsTransformMatrix, this.myCollisionsTransformMatrix);

        if (!this.#lastColliderTransformMatrix.equals(this.myCollisionsTransformMatrix)) {
            
            this.#lastColliderTransformMatrix = this.myCollisionsTransformMatrix.clone();

            new Uint8Array(this.#lastColliderWorldVectors).set(new Uint8Array(this.verticesPositionBuffer));
           // new Uint8Array(this.facesBufferCollider).set(new Uint8Array(this.facesBuffer));

            let timer = performance.now();
            let i = 0
            let len1 = this.#colliderVertices.length
            let len2 = this.#faces.length;

            while (i < len1) {
                this.#colliderVertices[i].multiply(this.myCollisionsTransformMatrix);
                i++;
            }
            console.log('recalculated collision vertices', performance.now() - timer);
            i = 0;
            while (i < len2) {
                this.#faces[i].updatePlane();
                i++;
            }
        }
        
        /*const facesBufferSwap = this.engine.gpu.createGPUBuffer(this.facesBuffer.byteLength, [GPUBufferUsage.COPY_SRC], true);
        //new Uint8Array(facesBufferSwap.getMappedRange()).set(new Uint8Array(this.facesBufferCollider));
        facesBufferSwap.unmap();

        const normalizedVelocityBufferSwap = this.engine.gpu.createGPUBuffer(normalizedVelocity.byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Uint8Array(normalizedVelocityBufferSwap.getMappedRange()).set(new Uint8Array(normalizedVelocity.buffer));
        normalizedVelocityBufferSwap.unmap();
        const commandEncoder = this.engine.gpu.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(facesBufferSwap, 0, this.facesGPUBufferCollide, 0, this.#faces.length * 4)
        commandEncoder.copyBufferToBuffer(normalizedVelocityBufferSwap, 0, this.normalizedVelocityBuffer, 0, 3 * 4)

        const passEncoder = commandEncoder.beginComputePass();


        passEncoder.setPipeline(collider.pipeline);
        passEncoder.setBindGroup(0, this.sourceBindGroup);
        passEncoder.dispatch(this.#faces.length);
        passEncoder.endPass();

        commandEncoder.copyBufferToBuffer(this.normalizedVelocityDotBuffer, 0, this.normalizedVelocityDotBufferRead, 0, this.#faces.length * 4)

        const gpuCommands = commandEncoder.finish();
        this.engine.gpu.device.defaultQueue.submit([gpuCommands]);

        await this.normalizedVelocityDotBufferRead.mapAsync(GPUMapMode.READ);

        const dots = new Float32Array(this.normalizedVelocityDotBufferRead.getMappedRange());
        this.normalizedVelocityDotBufferRead.unmap();
        console.log('gpu took', performance.now() - timer);*/
        //let timer = performance.now();

        this.#faces.forEach(triangle => {
            collider._testTriangle(triangle);
        });
       // console.log('cpu took', performance.now() - timer);
       // timer = performance.now();
        this.engine.wasm.testTriangles(this.facesBufferColliderPointer, this.facesBuffer.byteLength, basePoint.byteOffset, VelocityWasm.byteOffset)
        //console.log('wasm took', performance.now() - timer);
    }
}
export class PositionNode extends MainNode {
    worldPosition: worldPosition = new worldPosition(this);
    constructor(engine: Engine, bufferOffsetBytes?: number) {
        super(engine, bufferOffsetBytes);
    }
}