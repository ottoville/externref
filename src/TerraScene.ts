import type { GPU } from "./GPU";
import { TerraMatrix } from "./traits/worldPosition";
import { Matrix, Vector3 } from "./lib/babylon/Maths/math.js";
import { Physics } from "./physics";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera";
import type { RenderPass } from "./GPU/RenderPass";
import type { ICollisionCoordinator } from "../wwwroot/js/lib/babylon/Collisions/collisionCoordinator";
import type { Collider } from "../wwwroot/js/lib/babylon/Collisions/collider";
import { TerraCamera } from "./TerraCamera";
import { Light } from "./lights";
import { Sun2 } from "./world/sun2";
import { BoundableNode, PickingInfo } from "./TerraNode";
import { BindGroupLayout, DynamicBindGroupLayout } from "./GPU/BindGroupLayout";
import { Engine } from "./engine";
import { Scene } from "./Scene";
//import { Camera } from "../wwwroot/js/lib/babylon/Cameras/camera";

/*interface Ray {
    origin: any,
    direction: any,
}*/
//const _tempPickingRay: Ray = Ray.Zero();



function getViewMatrix(alpha: number, beta: number, radius: number, target: Vector3, computationVector: Vector3, upVector: Vector3, YToUpMatrix: Matrix, position: Vector3, targetScreenOffset: Vector2, checkCollisions: boolean, coordinator: ICollisionCoordinator, collider: Collider, collisionRadius: Vector3, collisionVelocity: Vector3, onCollisionPositionChange: any, uniqueId: number) : [Matrix, boolean] {
    let collisionTriggered: boolean = false;
    const viewMatrix: Matrix = Matrix.Zero();
    const newPosition: Vector3 = Vector3.Zero()
    var cosa = Math.cos(alpha);
    var sina = Math.sin(alpha);
    var cosb = Math.cos(beta);
    var sinb = Math.sin(beta);
    if (sinb === 0) {
        sinb = 0.0001;
    }
    computationVector.copyFromFloats(radius * cosa * sinb, radius * cosb, radius * sina * sinb);

    // Rotate according to up vector
    if (upVector.x !== 0 || upVector.y !== 1.0 || upVector.z !== 0) {
        Vector3.TransformCoordinatesToRef(computationVector, YToUpMatrix, computationVector);
    }
    target.addToRef(computationVector, newPosition);
    
    /*if (checkCollisions) {
        if (!collider) {
            collider = coordinator.createCollider();
        }
        collider._radius = collisionRadius;
        newPosition.subtractToRef(position, collisionVelocity);
        collisionTriggered = true;
        coordinator.getNewPosition(position, collisionVelocity, collider, 3, null, onCollisionPositionChange, uniqueId);
    } else {*/






        position.copyFrom(newPosition);

        var up = upVector;
      /*  if (this.allowUpsideDown && sinb < 0) {
            up = up.negate();
        }*/
    Matrix.LookAtRHToRef(position, target, up, viewMatrix);
    //debugger;
        viewMatrix.addAtIndex(12, targetScreenOffset.x);
        viewMatrix.addAtIndex(13, targetScreenOffset.y);
   // }
    //this._currentTarget = target;
    return [viewMatrix, collisionTriggered];
}

function matrixMultiply64(m: Float32Array | Float64Array, otherM: Float32Array | Float64Array, result: Float64Array): void {
    var tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3];
    var tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7];
    var tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11];
    var tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15];

    var om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3];
    var om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7];
    var om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11];
    var om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
    result[0] = tm0 * om0 + tm1 * om4 + tm2 * om8 + tm3 * om12;
    result[1] = tm0 * om1 + tm1 * om5 + tm2 * om9 + tm3 * om13;
    result[2] = tm0 * om2 + tm1 * om6 + tm2 * om10 + tm3 * om14;
    result[3] = tm0 * om3 + tm1 * om7 + tm2 * om11 + tm3 * om15;

    result[4] = tm4 * om0 + tm5 * om4 + tm6 * om8 + tm7 * om12;
    result[5] = tm4 * om1 + tm5 * om5 + tm6 * om9 + tm7 * om13;
    result[6] = tm4 * om2 + tm5 * om6 + tm6 * om10 + tm7 * om14;
    result[7] = tm4 * om3 + tm5 * om7 + tm6 * om11 + tm7 * om15;

    result[8] = tm8 * om0 + tm9 * om4 + tm10 * om8 + tm11 * om12;
    result[9] = tm8 * om1 + tm9 * om5 + tm10 * om9 + tm11 * om13;
    result[10] = tm8 * om2 + tm9 * om6 + tm10 * om10 + tm11 * om14;
    result[11] = tm8 * om3 + tm9 * om7 + tm10 * om11 + tm11 * om15;

    result[12] = tm12 * om0 + tm13 * om4 + tm14 * om8 + tm15 * om12;
    result[13] = tm12 * om1 + tm13 * om5 + tm14 * om9 + tm15 * om13;
    result[14] = tm12 * om2 + tm13 * om6 + tm14 * om10 + tm15 * om14;
    result[15] = tm12 * om3 + tm13 * om7 + tm14 * om11 + tm15 * om15;
}
function matrixInvert64(m: Float32Array | Float64Array): void {
    // the inverse of a Matrix is the transpose of cofactor matrix divided by the determinant
    const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
    const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
    const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
    const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];

    const det_22_33 = m22 * m33 - m32 * m23;
    const det_21_33 = m21 * m33 - m31 * m23;
    const det_21_32 = m21 * m32 - m31 * m22;
    const det_20_33 = m20 * m33 - m30 * m23;
    const det_20_32 = m20 * m32 - m22 * m30;
    const det_20_31 = m20 * m31 - m30 * m21;

    const cofact_00 = +(m11 * det_22_33 - m12 * det_21_33 + m13 * det_21_32);
    const cofact_01 = -(m10 * det_22_33 - m12 * det_20_33 + m13 * det_20_32);
    const cofact_02 = +(m10 * det_21_33 - m11 * det_20_33 + m13 * det_20_31);
    const cofact_03 = -(m10 * det_21_32 - m11 * det_20_32 + m12 * det_20_31);

    const det = m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;

    if (det === 0) {
        // not invertible
        return;
    }

    const detInv = 1 / det;
    const det_12_33 = m12 * m33 - m32 * m13;
    const det_11_33 = m11 * m33 - m31 * m13;
    const det_11_32 = m11 * m32 - m31 * m12;
    const det_10_33 = m10 * m33 - m30 * m13;
    const det_10_32 = m10 * m32 - m30 * m12;
    const det_10_31 = m10 * m31 - m30 * m11;
    const det_12_23 = m12 * m23 - m22 * m13;
    const det_11_23 = m11 * m23 - m21 * m13;
    const det_11_22 = m11 * m22 - m21 * m12;
    const det_10_23 = m10 * m23 - m20 * m13;
    const det_10_22 = m10 * m22 - m20 * m12;
    const det_10_21 = m10 * m21 - m20 * m11;

    const cofact_10 = -(m01 * det_22_33 - m02 * det_21_33 + m03 * det_21_32);
    const cofact_11 = +(m00 * det_22_33 - m02 * det_20_33 + m03 * det_20_32);
    const cofact_12 = -(m00 * det_21_33 - m01 * det_20_33 + m03 * det_20_31);
    const cofact_13 = +(m00 * det_21_32 - m01 * det_20_32 + m02 * det_20_31);

    const cofact_20 = +(m01 * det_12_33 - m02 * det_11_33 + m03 * det_11_32);
    const cofact_21 = -(m00 * det_12_33 - m02 * det_10_33 + m03 * det_10_32);
    const cofact_22 = +(m00 * det_11_33 - m01 * det_10_33 + m03 * det_10_31);
    const cofact_23 = -(m00 * det_11_32 - m01 * det_10_32 + m02 * det_10_31);

    const cofact_30 = -(m01 * det_12_23 - m02 * det_11_23 + m03 * det_11_22);
    const cofact_31 = +(m00 * det_12_23 - m02 * det_10_23 + m03 * det_10_22);
    const cofact_32 = -(m00 * det_11_23 - m01 * det_10_23 + m03 * det_10_21);
    const cofact_33 = +(m00 * det_11_22 - m01 * det_10_22 + m02 * det_10_21);
    m[0] = cofact_00 * detInv;
    m[1] = cofact_10 * detInv;
    m[2] = cofact_20 * detInv;
    m[3] = cofact_30 * detInv;
    m[4] = cofact_01 * detInv;
    m[5] = cofact_11 * detInv;
    m[6] = cofact_21 * detInv;
    m[7] = cofact_31 * detInv;
    m[8] = cofact_02 * detInv;
    m[9] = cofact_12 * detInv;
    m[10] = cofact_22 * detInv;
    m[11] = cofact_32 * detInv;
    m[12] = cofact_03 * detInv;
    m[13] = cofact_13 * detInv;
    m[14] = cofact_23 * detInv;
    m[15] = cofact_33 * detInv;

}
export class TerraScene extends Scene {

    static instance: TerraScene;

    //context: GPUCanvasContext = this.canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
    camera!: ArcRotateCamera;
    positionBindGroupLightsTime;
    positionBindGroupLightsTimeWGSL;
    lightsBindGroupTexture: import("C:/Users/ottov/source/repos/terrasim/src/GPU/BindGroupLayout").LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;
    render(time: DOMHighResTimeStamp, renderEncoder: GPUCommandEncoder) {

    }
    constructor(engine: Engine, private window: Window, public canvas: HTMLCanvasElement, gpu: GPU, public TerraCameras: TerraCamera[], onRenderStart?: (scene: TerraScene) => Promise<ArcRotateCamera>) {
        super(gpu, engine);
        TerraScene.instance = this;

        const renderPasses: Set<RenderPass> = new Set([gpu.renderPassScreen, gpu.renderPassWater]);

        engine.physics.gameSpeed = 0;


        this.positionBindGroupLightsTime = this.lightsBindGroup.addChildBindGroup(this.gpu.BindGroup, true);
        this.positionBindGroupLightsTime.onRender = async () => {
            return this.gpu.updateGPUBuffer();
        }
        this.positionBindGroupLightsTimeWGSL = this.lightsBindGroupWGSL.addChildBindGroup(this.gpu.BindGroup, true);

        this.lightsBindGroupTexture = this.lightsBindGroupWGSL.addChildLayout(this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        }));
        (async () => {
            onRenderStart && (this.camera = await onRenderStart(this));
            
            
        })();
    }

    sunPosition: Float32Array = new Float32Array(3);
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
    pickingRayLayout = this.gpu.createBindGroupLayout(
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
    calculatePickingRaysPipeline = this.gpu.createComputePipeline("calculatePickingRays.comp", this.gpu.device.createPipelineLayout({
        bindGroupLayouts: [this.pickingRayLayout]
    }));
    bindgrouplayout1 = this.gpu.device.createBindGroupLayout({
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
        const bindGroup1 = this.calculatePickingRaysPipeline.createBindGroup(this.bindgrouplayout1, [
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
        passEncoder.setPipeline(this.calculatePickingRaysPipeline);
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
    static tempM1 = new Float64Array(16);
  
}