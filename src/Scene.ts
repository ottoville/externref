import { MainNode } from "./TerraNode.js";
import type { BoundableNode, PickingInfo } from "./DataNode.js";
import type { GPU } from "./GPU.js";
import type { Engine } from "./engine.js";
import type { TerraCamera } from "./TerraCamera.js";
import { TerraVector3 } from "./Math.js";

let sceneID=1;
export class Scene {
    readonly id=sceneID;
    ready?: Promise<any>;

    constructor(public name: string, public gpu: GPU, public engine: Engine, public TerraCameras: [TerraCamera] | TerraCamera[], onRenderStart: (scene: Scene) => [ready?: Promise<any>]) {
        sceneID<<=1;
        this.TerraCameras[0].renderPass.onResize.add(() => {
            const oldpickBuffer=this.pickBuffer;
            if(oldpickBuffer) {
                setTimeout(() => {
                    oldpickBuffer.destroy();
                },1000);
            }
            this.pickBuffer = this.gpu.device.createBuffer({
                size: this.gpu.renderPassScreen.size[0] * this.gpu.renderPassScreen.size[1] * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });
        })
        engine.scenes.set(name, this);
        TerraCameras.forEach(camera => {
            camera.renderPass.scenes.add(this);
        })

        const [groundAndSea] = onRenderStart(this);
        this.ready = groundAndSea;
    }
    async collissionCheck(rayFunction: (mesh: BoundableNode) => any, boundables: IterableIterator<BoundableNode>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: BoundableNode) => boolean): Promise<PickingInfo | null> {
        if (fastCheck) {
            throw ('TODO: fastcheck');
        }
        let boundableMesh: BoundableNode;
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
    }//@ts-ignore
    pickPromise: Promise<{ position: TerraVector3, meshId: number }> | null = null;
    pickBuffer: GPUBuffer | null = null
    pickPosition(): Promise<{ position: TerraVector3, meshId: number }> {
        if (this.pickPromise) {
            return this.pickPromise
        }
        const camera = this.TerraCameras[0];
        const offset = (this.engine.mousePosition[1]! * this.gpu.renderPassScreen.size[0] + this.engine.mousePosition[0]!) * 4;
        const padding = offset % 16;

        const buffer=this.pickBuffer!;

        const encoder = this.gpu.device.createCommandEncoder();
        encoder.copyTextureToBuffer(
            {
                texture: this.  gpu.renderPassScreen.depthTexture!.texture,
                aspect: "depth-only",
                origin: { x: 0, y: 0, z: 0 }
            },
            {
                buffer,
                bytesPerRow: this.gpu.renderPassScreen.size[0] * 4,
                offset: 0
            },
            [this.gpu.renderPassScreen.size[0], this.gpu.renderPassScreen.size[1]]
        );
        encoder.copyTextureToBuffer(
            {
                texture: this.gpu.renderPassScreen.renderTargets.gRenderTargetNormals.texture.texture,
                origin: { x: this.engine.mousePosition[0], y: this.engine.mousePosition[1], z: 0 }
            },
            {
                buffer,
                bytesPerRow: 256,
                offset: offset - padding + 32
            },
            [1, 1, 1]
        );

        this.gpu.device.queue.submit([encoder.finish()]);
        
        this.pickPromise = buffer.mapAsync(GPUMapMode.READ,offset - padding,padding + 32 + 16).then(() => {
            const b = buffer.getMappedRange(offset - padding,padding + 32 + 16);
            const z = new DataView(b).getFloat32(padding, true);
            
            const result = new TerraVector3();
            const x = this.engine.mousePosition[0]! / this.gpu.renderPassScreen.size[0] * 2 - 1;
            const y = -(this.engine.mousePosition[1]! / this.gpu.renderPassScreen.size[1] * 2 - 1);
            new TerraVector3([x, y, z]).multiply2Ref(camera.projectionViewInverted, result);

            const meshId = new DataView(b).getUint32(32 + 12, true); //mesh id is after normals vec3
            buffer.unmap();
            this.pickPromise = null;
            return { position: result, meshId };
        });
        //Calculate inverted matrix while buffer is mapping
        if (camera.projectionViewInvertedIsDirty) {
            camera.projectionViewArr.invertToRef(camera.projectionViewInverted);
            camera.projectionViewInvertedIsDirty = false;
        }
        return this.pickPromise;
    }
    async pickMesh(wantedMeshIds?: Set<number>, predicate?: (mesh: MainNode) => boolean): Promise<{ position: TerraVector3, mesh: MainNode } | null> {
        const pickInfo = await this.pickPosition();
        if (wantedMeshIds && !wantedMeshIds.has(pickInfo.meshId)) {
            return null;
        }
        else {
            const mesh = MainNode.Meshes.get(pickInfo.meshId);
            if (!mesh) {
                throw ('Mesh not found');
            }
            if (predicate && !predicate(mesh)) {
                return null;
            } else {
                return { position: pickInfo.position, mesh };
            }
        }
        //@ts-ignore
        const ray = this.TerraCameras[0].createPickingRay(x, y);
        const rayArr = new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]])
        const pickingRays: Map<BoundableNode, Float32Array> = new Map();
        this.gpu.boundables.forEach(boundable => {
            if (boundable.isStatic)
                return pickingRays.set(boundable, rayArr);
            //@ts-ignore
            const ray = this.TerraCameras[0].createPickingRay(x, y, boundable.get_transformation());
            return pickingRays.set(boundable, new Float32Array([ray.origin[0], ray.origin[1], ray.origin[2], ray.direction[0], ray.direction[1], ray.direction[2]]));
        });
        const results: Promise<void>[] = [];
        pickingRays.forEach((ray, boundable) => {
            results.push(boundable.intersectsRay(ray));
        })
        //await Promise.all(results);
        let minimum: BoundableNode | null = null;

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

    }
}

