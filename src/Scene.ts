import { Light } from "./lights.js";
import { BoundableNode, MainNode, PickingInfo } from "./TerraNode.js";
import type { GPU } from "./GPU.js";
import type { Engine } from "./engine.js";
import type { TerraCamera } from "./TerraCamera.js";
import { TerraMatrix, TerraVector3 } from "./Math.js";
import { DrawableDirect } from "GPU/Drawable.js";
export class Scene {


    lights;


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
    pickPromise(cb: (pick?: { position: TerraVector3, mesh: MainNode }) => void, wantedMeshIds?: Set<number>, predicate?: (mesh: MainNode) => boolean): void {

        let start = performance.now();
        const encoder = this.gpu.device.createCommandEncoder();

        const buffer = this.gpu.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })
        encoder.copyTextureToBuffer(
            {
                texture: this.gpu.renderPassScreen.renderTargets.gRenderTargetPositions.texture,
                origin: { x: this.engine.mousePosition[0], y: this.engine.mousePosition[1] }
            },
            {
                buffer,
                bytesPerRow: 256,
                offset: 0
            },
            [1, 1, 1]);
        this.gpu.device.queue.submit([encoder.finish()]);

        buffer.mapAsync(GPUMapMode.READ).then(() => {
            const b = buffer.getMappedRange();
            const meshId = new DataView(b).getUint32(12, true);
            console.log('picking took', performance.now() - start) //55
            if (meshId === 0 || (wantedMeshIds && !wantedMeshIds.has(meshId))) {
                cb();
            }
            else {
                const mesh = MainNode.Meshes.get(meshId);
                if (!mesh) {
                    throw ('Mesh not found');
                }
                if (predicate && !predicate(mesh)) {
                    cb();
                } else {
                    const position = new TerraVector3(b);
                    cb({ position, mesh });
                }
            }
            buffer.destroy();
        });
        return;
        //@ts-ignore
        const ray = this.TerraCameras[0].createPickingRay(x, y);
        const rayArr = new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]])
        const pickingRays: Map<BoundableNode<DrawableDirect>, Float32Array> = new Map();
        this.gpu.boundables.forEach(boundable => {
            if (boundable.isStatic)
                return pickingRays.set(boundable, rayArr);
            //@ts-ignore
            const ray = this.TerraCameras[0].createPickingRay(x, y, boundable.get_transformation());
            pickingRays.set(boundable, new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]]));
        });
        const results: Promise<void>[] = [];
        pickingRays.forEach((ray, boundable) => {
            results.push(boundable.intersectsRay(ray));
        })
        //await Promise.all(results);
        let minimum: BoundableNode<DrawableDirect> | null = null;

        this.gpu.boundables.forEach(boundable => {
            if (!minimum || boundable.pickInfo.getDistance() < minimum.pickInfo.getDistance())
                minimum = boundable;

        });
        /*pickresults.forEach(pickresult => {
            if (pickresult.hit) {
                if (!minimum || pickresult.distance < minimum.distance)
                    minimum = pickresult;
            }
        })
        console.log(minimum);*/
        //return minimum;

        let rayFunction = (boundableMesh: BoundableNode<DrawableDirect>) => {

            let m = new TerraMatrix([1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0]);
            if (!boundableMesh.isStatic) {
                m = boundableMesh.get_transformation();
            }
            //@ts-ignore
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

