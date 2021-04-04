import { Light } from "./lights.js";
import type { BoundableNode, PickingInfo } from "./TerraNode.js";
import type { GPU } from "./GPU.js";
import type { Engine } from "./engine.js";
import { PipelineLayout } from "./GPU/PipelineLayout.js";
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

    render(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass<{}>) {
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
        PipelineLayout.instances.forEach((bgt) => { drawedMeshes += this.gpu.drawBindGroups(renderPassEncoder, bgt, renderPass, 2, this) });
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

    const encoder = this.gpu.device.createCommandEncoder();
    
    const renderTarget=this.gpu.renderPassScreen.renderTargets.gRenderTargetPositions;
    const bytes_per_fixel = 16;
    const buffer = this.gpu.device.createBuffer({
        size: this.gpu.canvas.height * this.gpu.canvas.width * bytes_per_fixel,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    encoder.copyTextureToBuffer({
        texture: renderTarget.texture
    }, { buffer: buffer, bytesPerRow: this.gpu.canvas.width * bytes_per_fixel },
        [this.gpu.canvas.width, this.gpu.canvas.height, 1]);
    this.gpu.device.queue.submit([encoder.finish()]);
    buffer.mapAsync(GPUMapMode.READ).then(() => {
        const floatData=new Float32Array(buffer.getMappedRange());
        console.log(floatData);

    })






        //let start = performance.now();
        const ray = this.TerraCameras[0].createPickingRay(x, y);
        const rayArr = new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]])
        const pickingRays: Map<BoundableNode<DrawableDirect>, Float32Array> = new Map();
        this.boundables.forEach(boundable => {
            if (boundable.isStatic)
                return pickingRays.set(boundable, rayArr);
            const ray = this.TerraCameras[0].createPickingRay(x, y, boundable.get_transformation());
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
                m = boundableMesh.get_transformation();
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

