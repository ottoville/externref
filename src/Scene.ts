import { Light } from "./lights";
import type { BoundableNode, PickingInfo } from "./TerraNode";
import type { GPU } from "./GPU";
import { Sun2 } from "./world/sun2";
import type { Engine } from "./engine";
import { BindGroupLayout, DynamicBindGroupLayout, LayoutGroupDrawable } from "./GPU/BindGroupLayout";
import { TerraMatrix } from "./traits/worldPosition";
import type { TerraCamera } from "./TerraCamera";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera";
import { RenderPass } from "./GPU/RenderPass";
import { RenderPipeline } from "./GPU/RenderPipeline";

export abstract class Scene {
    boundables: Set<BoundableNode> = new Set();
    lights;
    //lightsBindGroup: BindGroupLayout;
    lightsBindGroupWGSL: BindGroupOneBinding;
    positionBindGroupLightsTime: DynamicBindGroupLayout<[number]>;
    positionBindGroupLightsTimeWGSL: LayoutGroupDrawable<[GPUBindGroupEntry]>;
    lightsBindGroupTexture: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;
    rootRenderLayout: BindGroupLayout;
    constructor(public gpu: GPU, public engine: Engine, public TerraCameras: TerraCamera[], onRenderStart: (scene: Scene, sunBufferOffsetBytes: number) => void) {

        TerraCameras.forEach(camera =>
            camera.renderPass.scenes.add(this)
        )

        const sunBufferOffsetBytes = gpu.DataSlots.pop();
        if (typeof (sunBufferOffsetBytes) == 'undefined')
            throw ('Out of memory');
        this.lights = new Light(gpu, sunBufferOffsetBytes);

        this.rootRenderLayout = new BindGroupLayout(this.gpu, this.lights.uniformBindGroupLayoutLightsWGSL, undefined,undefined,false,true)
        
        //this.lightsBindGroup = gpu.addBindGroup(this.lights.uniformBindGroupLights);
        //this.lightsBindGroupWGSL = gpu.addBindGroup(this.lights.uniformBindGroupLightsWGSL);


        this.lightsBindGroupWGSL = gpu.createBindGroup(
            this.lights.uniformBindGroupLayoutLightsWGSL,
            {
                binding: 0,
                resource: {
                    buffer: this.gpu.GPUData, //this.#lightsBuffer
                    size: 256,
                    offset: sunBufferOffsetBytes
                }
            });
        this.positionBindGroupLightsTime = gpu.addBindGroup(this.gpu.BindGroup, true);
        this.positionBindGroupLightsTime.onRender = async () => {
            return this.gpu.updateGPUBuffer();
        }

        this.positionBindGroupLightsTimeWGSL = new LayoutGroupDrawable(gpu, gpu.BindGroupLayout)
        

        const layout = this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        });
        this.lightsBindGroupTexture = new LayoutGroupDrawable(gpu, layout);
       /* this.lightsBindGroupTexture = this.lightsBindGroupWGSL.addChildLayout(this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        }));*/
        onRenderStart(this, sunBufferOffsetBytes)
    }
    rootRenderPipeLines: Set<RenderPipeline> = new Set();
    
    render(renderPassEncoder: GPURenderPassEncoder, renderPass: RenderPass, time: DOMHighResTimeStamp, physicDelta: number | null) {
        renderPassEncoder.setBindGroup(1, this.lights.uniformBindGroupLightsWGSL);
        this.rootRenderPipeLines.forEach(rp => {
            rp.draw(this, renderPassEncoder, renderPass, 2);
        });
        this.gpu.render(this, renderPassEncoder, renderPass, time, physicDelta);
    }
    async collissionCheck(rayFunction: (mesh: BoundableNode) => any, boundables: IterableIterator<BoundableNode>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: BoundableNode) => boolean): Promise<PickingInfo | null> {
        let boundableMesh: BoundableNode;
        do {
            const boundable = boundables.next();
            if (boundable.done)
                return new Promise(res => res(pickResult));
            boundableMesh = boundable.value;

        } while (predicate ? !predicate(boundableMesh) : false);

        const ray = rayFunction(boundableMesh);
        const result = await boundableMesh.intersects(ray);
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
    async pickPromise(x: number, y: number, predicate?: (mesh: BoundableNode) => boolean, fastCheck?: boolean): Promise<BoundableNode | null> {

        const b1 = this.gpu.createGPUBuffer(10 * 6 * 4, [GPUBufferUsage.STORAGE], true);
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

        const ray = this.TerraCameras[0].createPickingRay(x, y);
        const rayArr = new Float32Array([ray.origin.x, ray.origin.y, ray.origin.z, ray.direction.x, ray.direction.y, ray.direction.z])
        const pickingRays: Map<BoundableNode, Float32Array> = new Map();
        console.log(this.boundables);
        this.boundables.forEach(boundable => {
            if (!boundable.worldPosition)
                return pickingRays.set(boundable, rayArr);
            const ray = this.TerraCameras[0].createPickingRay(x, y, boundable.worldPosition.worldMatrix);
            pickingRays.set(boundable, new Float32Array([ray.origin.x, ray.origin.y, ray.origin.z, ray.direction.x, ray.direction.y, ray.direction.z]));
        });
        const results: Promise<void>[] = [];
        pickingRays.forEach((ray, boundable) => {
            results.push(boundable.intersects(ray));
        })
        const pickresults = await Promise.all(results);
        let minimum: BoundableNode | null = null;

        this.boundables.forEach(boundable => {
            if (!minimum || boundable.pickInfo.distance[0] < minimum.pickInfo.distance[0])
                minimum = boundable;

        })
        /*pickresults.forEach(pickresult => {
            if (pickresult.hit) {
                if (!minimum || pickresult.distance < minimum.distance)
                    minimum = pickresult;
            }
        })
        console.log(minimum);*/
        return minimum;

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

        let rayFunction = (boundableMesh: BoundableNode) => {

            let m = new TerraMatrix([1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0]);
            if (boundableMesh.worldPosition) {
                m = boundableMesh.worldPosition.worldMatrix;
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

