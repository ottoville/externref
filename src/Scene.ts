import { Light } from "./lights.js";
import type { BoundableNode, PickingInfo } from "./TerraNode.js";
import type { GPU } from "./GPU.js";
import type { Engine } from "./engine.js";
import { BindGroupLayout } from "./GPU/BindGroupLayout.js";
import type { TerraCamera } from "./TerraCamera.js";
import type { RenderPass } from "./GPU/RenderPass.js";
import { TerraMatrix } from "./Math.js";
import { DrawableDirect } from "GPU/Drawable.js";

export class Scene {

    boundables: Set<BoundableNode<DrawableDirect>> = new Set();
    lights;
    positionBindGroupLightsTimeWGSL = this.gpu.rootSceneLayout.addChildLayout(this.gpu.BindGroupLayout);
    lightsBindGroupTexture = this.gpu.rootSceneLayout.addChildLayout(this.gpu.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {

        }
    }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {

        }
    }));
    ready?: Promise<any>;

    constructor(public name: string, public gpu: GPU, public engine: Engine, public TerraCameras: [TerraCamera] | TerraCamera[], onRenderStart: (scene: Scene) => [number, Promise<any>?]) {
        engine.scenes.set(name, this);
        TerraCameras.forEach(camera => {
            camera.renderPass.scenes.add(this);
        })

        const [sunBufferOffsetBytes, groundAndSea] = onRenderStart(this);
        this.ready = groundAndSea;
        this.lights = new Light(gpu, sunBufferOffsetBytes);
    }

    render(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass) {
        let drawedMeshes = 0;
        renderPassEncoder.setBindGroup(1, this.lights.uniformBindGroupLightsWGSL);
        this.gpu.rootSceneLayout.renderPipeLines.forEach(rp => {
            drawedMeshes += rp.draw(renderPassEncoder, renderPass, 2, this);
        });
        if (this.gpu.rootSceneLayout.subBindGroups.size) {
            this.gpu.rootSceneLayout.subBindGroups.forEach(bgt =>
                drawedMeshes += this.gpu.drawBindGroups(renderPassEncoder, bgt, renderPass, 2, this)
            )
        };
        BindGroupLayout.instances.forEach((bgt) => { drawedMeshes += this.gpu.drawBindGroups(renderPassEncoder, bgt, renderPass, 2, this) });
        return drawedMeshes;
    }
    async collissionCheck(rayFunction: (mesh: BoundableNode<DrawableDirect>) => any, boundables: IterableIterator<BoundableNode<DrawableDirect>>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: BoundableNode<DrawableDirect>) => boolean): Promise<PickingInfo | null> {
        if (fastCheck) {
            throw ('TODO: fastcheck');
        }
        let boundableMesh: BoundableNode<DrawableDirect>;
        do {
            const boundable = boundables.next();
            if (boundable.done)
                return new Promise(res => res(pickResult));
            boundableMesh = boundable.value;

        } while (predicate ? !predicate(boundableMesh) : false);

        const ray = rayFunction(boundableMesh);
        /*const result =*/ await boundableMesh.intersectsRay(ray);
        //TODO
        return null;
        /*if (!result || !result.hit)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        pickResult = result;
        if (fastCheck)
            return result;
        else
            return this.collissionCheck(rayFunction, boundables, pickResult);*/
    }
    async pickPromise(x: number, y: number, predicate?: (mesh: BoundableNode<DrawableDirect>) => boolean, fastCheck?: boolean): Promise<BoundableNode<DrawableDirect> | null> {
        if (predicate)
            console.warn('TODO: predicate');
        /* const b1 = this.gpu.createGPUBuffer(10 * 6 * 4, [GPUBufferUsage.STORAGE], true);
         const b1arr = b1.getMappedRange()
         new Float32Array(b1arr).set(this.TerraCameras[0].projectionArr);
         new Float32Array(b1arr).set(this.TerraCameras[0].viewArr, 16);
         const sourceX = x / this.gpu.renderPassScreen.size.width * 2 - 1;
         const sourceY = -(y / this.gpu.renderPassScreen.size.height * 2 - 1);
         new Float32Array(b1arr).set([
             sourceX,
             sourceY,
             -1.0,
             sourceX,
             sourceY,
             1.0
         ]
             , 32);
         b1.unmap();
         //Todo: Size from terranode
         const resultMatrixBuffer = this.gpu.createGPUBuffer(10 * 6 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
         const bindGroup1 = this.engine.calculatePickingRaysPipeline.createBindGroup(this.engine.bindgrouplayout1, [
             {
                 binding: 0,
                 resource: {
                     buffer: b1
                 }
             },
             {
                 binding: 1,
                 resource: {
                     buffer: this.gpu.GPUData
                 }
             },
             {
                 binding: 2,
                 resource: {
                     buffer: resultMatrixBuffer
                 }
             }
         ]);
         const commandEncoder = this.gpu.createCommandEncoder();
 
         const passEncoder = commandEncoder.beginComputePass();
         passEncoder.setPipeline(this.engine.calculatePickingRaysPipeline);
         passEncoder.setBindGroup(0, bindGroup1);
 
         passEncoder.dispatch(10);
 
         passEncoder.endPass();
         const gpuCommands = commandEncoder.finish();
         this.gpu.device.defaultQueue.submit([gpuCommands]);
         */
        //let start = performance.now();
        const ray = this.TerraCameras[0].createPickingRay(x, y);
        const rayArr = new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]])
        const pickingRays: Map<BoundableNode<DrawableDirect>, Float32Array> = new Map();
        this.boundables.forEach(boundable => {
            if (boundable.isStatic)
                return pickingRays.set(boundable, rayArr);
            const ray = this.TerraCameras[0].createPickingRay(x, y, boundable.transformation);
            pickingRays.set(boundable, new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]]));
        });
        const results: Promise<void>[] = [];
        pickingRays.forEach((ray, boundable) => {
            results.push(boundable.intersectsRay(ray));
        })
        /*const pickresults = */await Promise.all(results);
        let minimum: BoundableNode<DrawableDirect> | null = null;

        this.boundables.forEach(boundable => {
            if (!minimum || boundable.pickInfo.getDistance() < minimum.pickInfo.getDistance())
                minimum = boundable;

        })
        /*pickresults.forEach(pickresult => {
            if (pickresult.hit) {
                if (!minimum || pickresult.distance < minimum.distance)
                    minimum = pickresult;
            }
        })
        console.log(minimum);*/
        // console.log('picking took', performance.now() - start);
        return minimum;
        /*
        this.gpu.GPU2CPU(async buff => {
            await buff.mapAsync(GPUMapMode.READ);
            //  console.log(new Float32Array(buff.getMappedRange()))
            await this.gpu.GPU2CPU(async buff => {
                await buff.mapAsync(GPUMapMode.READ);
                const gpudata = new Float32Array(buff.getMappedRange());
                //console.log(gpudata);
                var matrix = Matrix.Zero();
                const worldM = Matrix.FromArray(gpudata);
                worldM.multiplyToRef(Matrix.FromArray(Array.from(this.TerraCameras[0].viewArr)), matrix);
                matrix.multiplyToRef(Matrix.FromArray(Array.from(this.TerraCameras[0].projectionArr)), matrix);

                //console.log(matrix);
                // console.log(this.createPickingRay(x, y, new Float32Array(gpudata, 0, 16)));
                //  debugger;
            }, this.gpu.GPUData);
        }, resultMatrixBuffer);
        */
        let rayFunction = (boundableMesh: BoundableNode<DrawableDirect>) => {

            let m = new TerraMatrix([1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0]);
            if (!boundableMesh.isStatic) {
                m = boundableMesh.transformation;
            }
            return this.TerraCameras[0].createPickingRay(x, y, m);
        };
        //TODO
        //@ts-ignore
        return this.collissionCheck(rayFunction, this.boundables.values(), null, fastCheck).then((pickResult: PickingInfo | null) => {
            /* if (pickResult) {
                 pickResult.ray = Ray.Zero();
                 this.createPickingRayToRef(x, y, Matrix.Identity(), pickResult.ray, this.cameraToUseForPointers || null, false)
             }*/
            return pickResult;
        });
    }
}

