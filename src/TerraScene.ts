import type { GPU } from "./GPU";
import { TerraMatrix } from "./traits/worldPosition";
import { Matrix, Vector3 } from "./lib/babylon/Maths/math.js";
import { Physics } from "./physics";
import { ArcRotateCamera } from "../wwwroot/js/lib/babylon/Cameras/arcRotateCamera";
import { RenderPass } from "./GPU/RenderPass";
import type { ICollisionCoordinator } from "../wwwroot/js/lib/babylon/Collisions/collisionCoordinator";
import type { Collider } from "../wwwroot/js/lib/babylon/Collisions/collider";
import { TerraCamera } from "./TerraCamera";
import { Light } from "./lights";
import { Sun2 } from "./world/sun2";
import { BoundableNode, PickingInfo } from "./TerraNode";
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
export class TerraScene {
    boundables: Set<BoundableNode> = new Set();
    mousePositionBuffer = new SharedArrayBuffer(4);
    mousePosition = new Uint16Array(this.mousePositionBuffer);

    mainCamera = new TerraCamera(this.gpuscene.renderPassScreen,this)
    waterCamera = new TerraCamera(this.gpuscene.renderPassWater,this)

    static instance: TerraScene;


    #lastStateChangeGameTime = BigInt(216000000); //21600 * 1000; //6 hours
    lastStateChangeTime = new Date().getTime()
    tickIntervalMs = 1000;
    physics = new Physics(this);
    canvasSize = {
        width: this.window.innerWidth | 0,
        height: this.window.innerHeight | 0
    };
    //context: GPUCanvasContext = this.canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
    camera!: ArcRotateCamera;
    lights: Light;
    positionBindGroupLightsTime;
    positionBindGroupLightsTimeWGSL;
    constructor(private window: Window, public canvas: HTMLCanvasElement, public gpuscene: GPU, onRenderStart?: (scene: TerraScene) => Promise<ArcRotateCamera>) {
        TerraScene.instance = this;

        canvas.addEventListener('pointermove', (e) => {
            //this.mousePosition.set([e.clientX, e.clientY]);
            Atomics.store(this.mousePosition, 0, e.clientX)
            Atomics.store(this.mousePosition, 1, e.clientY)
            Atomics.notify(new Int32Array(this.mousePositionBuffer), 0);
        })

        let renderFrame: number = 0;
        const renderPasses: Set<RenderPass> = new Set([gpuscene.renderPassScreen, gpuscene.renderPassWater]);
        let resizeHandler = 0;


        this.gpuscene = gpuscene;
        this.gameSpeed = 0;
        const sun = new Sun2(this);
        this.lights = new Light(this.gpuscene, sun.bufferOffsetBytes);
        this.positionBindGroupLightsTime = this.lights.lightsBindGroup.addChildBindGroup(this.gpuscene.BindGroup, true);
        this.positionBindGroupLightsTime.onRender = async (time) => {
            return this.gpuscene.updateGPUBuffer();
        }
        this.positionBindGroupLightsTimeWGSL = this.lights.lightsBindGroupWGSL.addChildBindGroup(this.gpuscene.BindGroup, true);

        (async () => {
            onRenderStart && (this.camera = await onRenderStart(this));
            
            const camera = this.camera;
            const terraScene = this;
            
            const renderLoop = function (time: DOMHighResTimeStamp) {

                const renderEncoder = gpuscene.device.createCommandEncoder();

                camera._checkInputs();

                // Cache
                camera._cache.mode = camera.mode;
                camera._cache.minZ = camera.minZ;
                camera._cache.maxZ = camera.maxZ;

                // Matrix
                //@ts-ignore
                camera._refreshFrustumPlanes = true;
                camera._cache.fov = camera.fov;
                camera._cache.fovMode = camera.fovMode;
                const aspectRatio = (TerraScene.instance.canvasSize.width * camera.viewport.width) / (TerraScene.instance.canvasSize.height * camera.viewport.height);
                camera._cache.aspectRatio = aspectRatio;

                if (camera.minZ <= 0) {
                    camera.minZ = 0.1;
                }

                Matrix.PerspectiveFovLHToRef(camera.fov,
                    aspectRatio,
                    camera.minZ,
                    camera.maxZ,
                    camera._projectionMatrix,
                    false);
                const projectionmatrix = camera._projectionMatrix;

                let viewMatrix: Matrix;
                let viewMatrix2: Matrix = Matrix.Zero();

                 viewMatrix = camera._getViewMatrix();
                //@ts-ignore
                //let foo= getViewMatrix(camera.alpha, camera.beta, camera.radius, camera.target, camera._computationVector, camera.upVector, camera._YToUpMatrix, camera.position, camera.targetScreenOffset, camera.checkCollisions, camera.getScene().collisionCoordinator, camera._collider, camera.collisionRadius, camera._collisionVelocity, camera._onCollisionPositionChange, camera.uniqueId);


                let globalPosition = Vector3.Zero();
                let globalCurrentTarget = Vector3.Zero();
                let globalCurrentUpVector = Vector3.Zero();

                globalPosition.copyFrom(camera.position);
                globalPosition.y-=(camera.position.y-3)*2
                globalCurrentTarget.copyFrom(camera.target);
                globalCurrentUpVector.copyFrom(camera.upVector);

                Matrix.LookAtLHToRef(globalPosition, globalCurrentTarget, globalCurrentUpVector, viewMatrix2);

                const modelViewProjectionMatrix = new Matrix();
                const modelViewProjectionMatrix2 = new Matrix();

                ///////////////
                terraScene.mainCamera.projectionArr.set(projectionmatrix.m)
                viewMatrix.multiplyToRef(projectionmatrix, modelViewProjectionMatrix);
                viewMatrix2.multiplyToRef(projectionmatrix, modelViewProjectionMatrix2);
                terraScene.mainCamera.projectionViewArr.set(modelViewProjectionMatrix.m);
                terraScene.waterCamera.projectionViewArr.set(modelViewProjectionMatrix2.m);
                terraScene.mainCamera.viewArr.set(viewMatrix.m);
                terraScene.mainCamera.cameraArr.set([camera.position.x, camera.position.y, camera.position.z]);

                terraScene.gpuscene.updateView(terraScene.mainCamera.projectionViewArr.buffer);

                terraScene.gpuscene.updateView2(terraScene.waterCamera.projectionViewArr.buffer);

                renderPasses.forEach(rp => rp.render(renderEncoder, time))

                terraScene.gpuscene.device.defaultQueue.submit([renderEncoder.finish()]);

                renderFrame = window.requestAnimationFrame(renderLoop);
            }
            //@ts-ignore
            let ro = new window.ResizeObserver((entries) => {
                window.cancelAnimationFrame(renderFrame)
                clearTimeout(resizeHandler);
                resizeHandler = setTimeout(() => {
                    this.canvasSize.width = this.canvas.getAttribute('width')! as any | 0;
                    this.canvasSize.height = this.canvas.getAttribute('height')! as any | 0;
                    renderPasses.forEach(renderpass => renderpass.onResize(this.canvasSize.width, this.canvasSize.height));
                    gpuscene.onResizes.forEach(cb => cb());
                    renderFrame = window.requestAnimationFrame(renderLoop);
                }, 500)
            });
            ro.observe(this.canvas)
            renderFrame=window.requestAnimationFrame(renderLoop);
            //todo: start and physics here
        })();
    }
    set gameSpeed(value: number) {
        console.log('set gameSpeed', value)
        this.#lastStateChangeGameTime = this.gameTime;
        this.lastStateChangeTime = new Date().getTime();

        this.physics.gameSpeed = Number(value);
    }
    get gameTime() {
        if (this.physics.gameSpeed < 0)
            return this.#lastStateChangeGameTime;
        var interval = new Date().getTime() - this.lastStateChangeTime;
        return this.#lastStateChangeGameTime + (BigInt((interval * 60) << this.physics.gameSpeed));
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
        if (!result || !result.hit)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        pickResult = result;
        if (fastCheck)
            return result;
        else
            return this.collissionCheck(rayFunction, boundables, pickResult);
    }
    pickingRayLayout = this.gpuscene.createBindGroupLayout(
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
    calculatePickingRaysPipeline = this.gpuscene.createComputePipeline("calculatePickingRays.comp", this.gpuscene.device.createPipelineLayout({
        bindGroupLayouts: [this.pickingRayLayout]
    }));
    bindgrouplayout1 = this.gpuscene.device.createBindGroupLayout({
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
    async pickPromise(x: number, y: number, predicate?: (mesh: BoundableNode) => boolean, fastCheck?: boolean): Promise<PickingInfo | null> {

        const b1 = this.gpuscene.createGPUBuffer(10 * 6 * 4, [GPUBufferUsage.STORAGE], true);
        const b1arr = b1.getMappedRange()
        new Float32Array(b1arr).set(this.mainCamera.projectionArr);
        new Float32Array(b1arr).set(this.mainCamera.viewArr, 16);
        const sourceX = x / this.gpuscene.renderPassScreen.size.width * 2 - 1;
        const sourceY = -(y / this.gpuscene.renderPassScreen.size.height * 2 - 1);
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
        const resultMatrixBuffer = this.gpuscene.createGPUBuffer(10 * 6 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
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
                    buffer: this.gpuscene.GPUData
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: resultMatrixBuffer
                }
            }
        ]);
        const commandEncoder = this.gpuscene.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.calculatePickingRaysPipeline);
        passEncoder.setBindGroup(0, bindGroup1);

        passEncoder.dispatch(10);



        passEncoder.endPass();
        const gpuCommands = commandEncoder.finish();
        this.gpuscene.device.defaultQueue.submit([gpuCommands]);

        const ray = this.createPickingRay(x, y);
        const pickingRays: Map<BoundableNode, { origin: Vector3, direction: Vector3 }> = new Map();

        this.boundables.forEach(boundable => {
            if (!boundable.worldPosition)
                return pickingRays.set(boundable,ray);
          //  const worldM = Matrix.FromArray(boundable.worldPosition.worldMatrix)
            //worldM.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.viewArr)), worldM);
           // worldM.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.projectionArr)), worldM);
          //  console.log(worldM.m);
          //  debugger;
            pickingRays.set(boundable, this.createPickingRay(x, y, boundable.worldPosition.worldMatrix));
        });
        const results: Promise<PickingInfo>[] = [];
        pickingRays.forEach((ray, boundable) => {
             results.push(boundable.intersects(ray));
        })
        const pickresults = await Promise.all(results);
        let minimum: PickingInfo | undefined;;
        pickresults.forEach(pickresult => {
            if (pickresult.hit) {
                if (!minimum || pickresult.distance < minimum.distance)
                    minimum = pickresult;
            }
        })
        console.log(minimum);
        return null;
        this.gpuscene.GPU2CPU(async buff => {
            await buff.mapAsync(GPUMapMode.READ);
          //  console.log(new Float32Array(buff.getMappedRange()))
            await this.gpuscene.GPU2CPU(async buff => {
                await buff.mapAsync(GPUMapMode.READ);
                const gpudata = new Float32Array(buff.getMappedRange());
                //console.log(gpudata);
                var matrix = Matrix.Zero();
                const worldM = Matrix.FromArray(gpudata);
                worldM.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.viewArr)), matrix);
                matrix.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.projectionArr)), matrix);

                //console.log(matrix);
               // console.log(this.createPickingRay(x, y, new Float32Array(gpudata, 0, 16)));
              //  debugger;
            }, this.gpuscene.GPUData);
        }, resultMatrixBuffer);

        let rayFunction = (boundableMesh: BoundableNode) => {

            let m = new TerraMatrix([1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0]);
            if (boundableMesh.worldPosition) {
                m = boundableMesh.worldPosition.worldMatrix;
            }
            return this.createPickingRay(x, y, m);
        };
        return this.collissionCheck(rayFunction, this.boundables.values(), null, fastCheck).then((pickResult: PickingInfo | null) => {
            /* if (pickResult) {
                 pickResult.ray = Ray.Zero();
                 this.createPickingRayToRef(x, y, Matrix.Identity(), pickResult.ray, this.cameraToUseForPointers || null, false)
             }*/
            return pickResult;
        });
    }
    static tempM1 = new Float64Array(16);
    createPickingRay(x: number, y: number, world?: Float32Array) {
        const viewport = {
            x: 0,
            y: 0,
            width: this.canvasSize.width,
            height: this.canvasSize.height
        }

        // Moving coordinates to local viewport world
        x = x - viewport.x;
        y = y - (this.canvasSize.height - viewport.y - viewport.height);

        //Todo, reuse matrix and vector

        //const matrix = world.multiply(viewProjection);

        /*const matrix = TerraScene.tempM1;
        matrixMultiply64(world, this.viewArr, matrix);
        matrixMultiply64(matrix, this.projectionArr, matrix);
        */


        if (world) {
            var matrix = Matrix.Zero();
            const worldM = Matrix.FromArray(world);
            worldM.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.viewArr)), matrix);
        } else {
            var matrix = Matrix.FromArray(Array.from(this.mainCamera.viewArr));
        }
        matrix.multiplyToRef(Matrix.FromArray(Array.from(this.mainCamera.projectionArr)), matrix);

        //TODO use matrixMultiply64 and matrixInvert64

        // matrixInvert64(matrix);
        // const inverted = Matrix.FromArray(matrix);
        //const inverted = Matrix.FromArray(matrix).invert();
        const inverted = matrix.invert();
        var nearScreenSource = Vector3.Zero()
        nearScreenSource.x = x / viewport.width * 2 - 1;
        nearScreenSource.y = -(y / viewport.height * 2 - 1);
        nearScreenSource.z = -1.0;
        var farScreenSource = (new Vector3()).copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        const nearVec3 = new Vector3();
        const farVec3 = new Vector3();
        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, inverted, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        const origin = (new Vector3()).copyFrom(nearVec3);
        const direction = new Vector3();
        farVec3.subtractToRef(nearVec3, direction);
        direction.normalize();
        return {
            origin,
            direction
        }
        // result.update(x, y, viewport.width, viewport.height, world ? world : Matrix.IdentityReadOnly, cameraViewSpace ? Matrix.IdentityReadOnly : camera.getViewMatrix(), camera.getProjectionMatrix());

    }
}